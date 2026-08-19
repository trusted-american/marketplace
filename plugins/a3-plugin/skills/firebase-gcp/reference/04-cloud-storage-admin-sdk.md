## Cloud Storage (Admin SDK)

### Initialization

```typescript
import { getStorage } from 'firebase-admin/storage';

const storage = getStorage();
const bucket = storage.bucket(); // Default bucket
const customBucket = storage.bucket('my-custom-bucket');
```

### Storage Structure

```
storage/
├── agencies/{agencyId}/
│   ├── files/
│   └── logos/
├── clients/{clientId}/
│   ├── files/
│   └── photos/
├── enrollments/{enrollmentId}/
│   └── files/
├── groups/{groupId}/
│   └── files/
├── statements/{statementId}/
│   └── files/
├── imports/
│   └── {importId}/
├── exports/
│   └── {exportId}/
└── users/{userId}/
    └── avatar/
```

### File Operations

```typescript
const bucket = getStorage().bucket();

// Get a file reference
const file = bucket.file(`clients/${clientId}/files/${fileName}`);

// Upload / save content
await file.save(buffer, {
  contentType: 'application/pdf',
  metadata: {
    metadata: {
      uploadedBy: userId,
      clientId: clientId,
      originalName: 'insurance_application.pdf',
    },
  },
});

// Save from string
await file.save('Hello, world!', { contentType: 'text/plain' });

// Save from stream
const readStream = fs.createReadStream('/tmp/report.pdf');
await new Promise((resolve, reject) => {
  readStream
    .pipe(file.createWriteStream({ contentType: 'application/pdf' }))
    .on('finish', resolve)
    .on('error', reject);
});

// Download file content
const [contents] = await file.download();
// contents is a Buffer

// Download to local file
await file.download({ destination: '/tmp/downloaded.pdf' });

// Check if file exists
const [exists] = await file.exists();

// Get signed URL (temporary access URL)
const [url] = await file.getSignedUrl({
  action: 'read',
  expires: Date.now() + 15 * 60 * 1000, // 15 minutes
});

// Signed URL for upload
const [uploadUrl] = await file.getSignedUrl({
  action: 'write',
  expires: Date.now() + 15 * 60 * 1000,
  contentType: 'application/pdf',
});

// Signed URL for delete
const [deleteUrl] = await file.getSignedUrl({
  action: 'delete',
  expires: Date.now() + 15 * 60 * 1000,
});

// Get file metadata
const [metadata] = await file.getMetadata();
console.log(metadata.name);        // File path
console.log(metadata.contentType); // MIME type
console.log(metadata.size);        // Size in bytes
console.log(metadata.updated);     // Last modified timestamp
console.log(metadata.metadata);    // Custom metadata

// Set file metadata
await file.setMetadata({
  contentType: 'application/pdf',
  metadata: {
    processedAt: new Date().toISOString(),
    status: 'scanned',
  },
});

// Delete file
await file.delete();
// Delete with ignoreNotFound
await file.delete({ ignoreNotFound: true });

// Copy file
await file.copy(bucket.file(`backups/clients/${clientId}/files/${fileName}`));
// Copy to another bucket
await file.copy(storage.bucket('archive-bucket').file('path/to/dest'));

// Move file (copy + delete original)
await file.move(bucket.file(`archive/${clientId}/files/${fileName}`));

// Make file publicly readable
await file.makePublic();
// Public URL: https://storage.googleapis.com/{bucket}/{filePath}

// Make file private again
await file.makePrivate();
```

### Listing Files

```typescript
// List files with a prefix
const [files] = await bucket.getFiles({
  prefix: `clients/${clientId}/files/`,
  maxResults: 100,
});
files.forEach((file) => {
  console.log(file.name, file.metadata.size);
});

// List with pagination
const [files, nextQuery] = await bucket.getFiles({
  prefix: 'clients/',
  maxResults: 100,
  autoPaginate: false,
});
if (nextQuery) {
  const [moreFiles] = await bucket.getFiles(nextQuery);
}

// List with delimiter (simulates directory listing)
const [files2, , apiResponse] = await bucket.getFiles({
  prefix: 'clients/',
  delimiter: '/',
});
// apiResponse.prefixes contains "subdirectories"
```

### Upload from Frontend

```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();
const storageRef = ref(storage, `clients/${clientId}/files/${fileName}`);

// Upload file
const snapshot = await uploadBytes(storageRef, file, {
  contentType: file.type,
  customMetadata: { uploadedBy: userId },
});

// Get download URL
const downloadURL = await getDownloadURL(snapshot.ref);
```

---
