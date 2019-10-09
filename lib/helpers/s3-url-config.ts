import { S3UrlKeyPosition } from "./enums/s3-url-key-postition.enum";

export interface S3UrlConfig {
    isAccelerated: boolean;
    keyPosition: S3UrlKeyPosition;
}
