export interface S3Credentials {
    key: string;
    secret: string;
    bucket: string;
    region: string;
    cdn_url?: string;
}
