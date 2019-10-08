import { S3Credentials } from "./helpers/s3-credentials";

export class DlnS3 {
    private readonly KEY: string;
    private readonly SECRET: string;
    private readonly BUCKET: string;
    private readonly REGION: string;

    private constructor(credentials: S3Credentials) {
        this.KEY = credentials.key;
        this.SECRET = credentials.secret;
        this.BUCKET = credentials.bucket;
        this.REGION = credentials.region;
    }

    static create(credentials: S3Credentials): DlnS3 {
        return new DlnS3(credentials);
    }

    test() {
        return "pass";
    }
}
