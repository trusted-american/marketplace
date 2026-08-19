## Client Upload Script — `client-upload.ts`

Bulk uploads Firestore client data to Neon PostgreSQL.

```typescript
// functions/src/neon/client-upload.ts
import * as admin from 'firebase-admin';
import { pool } from '../utils/db';

export async function uploadClientsToNeon(orgId: string): Promise<number> {
  const snapshot = await admin.firestore()
    .collection('organizations').doc(orgId)
    .collection('clients')
    .get();

  if (snapshot.empty) return 0;

  let uploadedCount = 0;
  const BATCH_SIZE = 500;
  const clients = snapshot.docs;

  for (let i = 0; i < clients.length; i += BATCH_SIZE) {
    const batch = clients.slice(i, i + BATCH_SIZE);

    // Build bulk INSERT with ON CONFLICT for upsert
    const values: any[] = [];
    const placeholders: string[] = [];

    batch.forEach((doc, index) => {
      const data = doc.data();
      const offset = index * 9; // 9 columns
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`,
      );
      values.push(
        doc.id,
        orgId,
        data.displayName || '',
        data.email || null,
        data.company || null,
        data.phone || null,
        data.address?.city || null,
        data.address?.state || null,
        data.tags || [],
      );
    });

    const sql = `
      INSERT INTO clients (id, organization_id, display_name, email, company, phone, address_city, address_state, tags)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = EXCLUDED.email,
        company = EXCLUDED.company,
        phone = EXCLUDED.phone,
        address_city = EXCLUDED.address_city,
        address_state = EXCLUDED.address_state,
        tags = EXCLUDED.tags,
        updated_at = NOW()
    `;

    await pool.query(sql, values);
    uploadedCount += batch.length;
  }

  return uploadedCount;
}
```

### Trigger-Based Sync

For real-time sync, A3 uses Firestore triggers:

```typescript
export const onClientWriteSyncNeon = functions.firestore
  .document('organizations/{orgId}/clients/{clientId}')
  .onWrite(async (change, context) => {
    const { orgId, clientId } = context.params;

    if (!change.after.exists) {
      // Deleted — remove from Neon
      await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
      return;
    }

    const data = change.after.data()!;

    await pool.query(
      `INSERT INTO clients (id, organization_id, display_name, email, company, phone, address_city, address_state, tags, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         display_name = $3, email = $4, company = $5, phone = $6,
         address_city = $7, address_state = $8, tags = $9, status = $10,
         updated_at = NOW()`,
      [
        clientId, orgId,
        data.displayName || '', data.email || null,
        data.company || null, data.phone || null,
        data.address?.city || null, data.address?.state || null,
        data.tags || [], data.status || 'active',
      ],
    );
  });
```

---
