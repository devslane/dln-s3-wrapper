import { S3Credentials } from "./helpers/s3-credentials";
import { S3UrlKeyPosition } from "./helpers/enums/s3-url-key-postition.enum";

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

    getRootUrl({
                   isAccelerated = false,
                   keyPosition = S3UrlKeyPosition.PARAM
               } = {}): string {
        const _tld = keyPosition === S3UrlKeyPosition.TLD ? this.BUCKET + "." : "";
        const _param = keyPosition === S3UrlKeyPosition.PARAM ? this.BUCKET + "/" : "";

        const _s3Domain = isAccelerated ? "s3-accelerate" : "s3." + this.REGION;

        return "https://" + _tld + _s3Domain + ".amazonaws.com/" + _param;
    }

    getRelativeUrl(namespace: string, directory?: string): string {
        let relativeUrl = namespace;

        if (directory) {
            relativeUrl = directory + "/" + relativeUrl;
        }

        return relativeUrl;
    }
}
