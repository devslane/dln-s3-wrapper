import { S3ACL } from './enums/s3-acl.enum';
import { Dictionary } from 'async';

export interface S3UploadConfig {
    directory?: string;
    acl?: S3ACL;
    contentType?: string;
    customMeta?: Dictionary<string>;
}
