import { S3ACL } from "./enums/s3-acl.enum";

export interface S3UploadConfig {
    acl?: S3ACL;
    contentType?: string;
    customMeta?: { [key: string]: string };
}
