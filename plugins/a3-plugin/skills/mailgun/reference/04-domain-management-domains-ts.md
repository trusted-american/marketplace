## Domain Management — `domains.ts`

### List Domains

```typescript
// GET /mailgun/domains — List configured domains
export async function listDomains(req: Request, res: Response) {
  const result = await mg.domains.list();
  return res.json(result);
  // Returns: { items: [{ name, state, type, ... }], total_count }
}
```

### Get Domain Details

```typescript
// GET /mailgun/domains/:domain — Get domain info and DNS records
export async function getDomain(req: Request, res: Response) {
  const { domain } = req.params;
  const result = await mg.domains.get(domain);
  return res.json(result);
  // Returns: { domain: { name, state, ... }, receiving_dns_records, sending_dns_records }
}
```

### Add Domain

```typescript
// POST /mailgun/domains — Add a new sending domain
export async function addDomain(req: Request, res: Response) {
  const { domain, dkimKeySize } = req.body;

  const result = await mg.domains.create({
    name: domain,
    spam_action: 'disabled',
    dkim_key_size: dkimKeySize || 2048,
    web_scheme: 'https',
    wildcard: false,
  });

  return res.json(result);
  // Returns domain info + required DNS records for verification
}
```

### Verify Domain

```typescript
// POST /mailgun/domains/:domain/verify — Trigger DNS verification
export async function verifyDomain(req: Request, res: Response) {
  const { domain } = req.params;
  const result = await mg.domains.verify(domain);
  return res.json(result);
  // Mailgun re-checks DNS records; state becomes 'active' if verified
}
```

### Domain States

| State | Meaning |
|---|---|
| `active` | Domain verified and ready for sending |
| `unverified` | DNS records not yet confirmed |
| `disabled` | Domain disabled by Mailgun (abuse, etc.) |

### Required DNS Records

When adding a domain, Mailgun requires these DNS records:

| Record Type | Purpose | Example |
|---|---|---|
| TXT | SPF verification | `v=spf1 include:mailgun.org ~all` |
| TXT | DKIM signing | `k=rsa; p=MIGfMA0G...` |
| CNAME | Tracking (opens/clicks) | `mailgun.org` |
| MX (optional) | Receiving email | `mxa.mailgun.org` / `mxb.mailgun.org` |

---
