# DevsLane S3 Wrapper Node

## Install

```bash
$ yarn add @devslane/node-s3-wrapper
```

## Code Examples

```typescript
import request from "request";
import { S3ACL } from "dln-s3-wrapper";

    const _imageDownload = request.get("https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png");

    await s3Service.uploadStream(_imageDownload, "image1.png", {
        directory: "testing",
        contentType: "image/jpeg",
        acl: S3ACL.PUBLIC_READ
    });

```

## Development
