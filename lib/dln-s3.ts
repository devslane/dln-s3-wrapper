import { S3Credentials } from './helpers/s3-credentials';
import { S3UrlKeyPosition } from './helpers/enums/s3-url-key-postition.enum';
import * as stream from 'stream';
import * as AWS from 'aws-sdk';
import { S3UploadConfig } from './helpers/s3-upload-config';
import { S3Operation } from './helpers/enums/s3-operation.enum';
import * as _ from 'lodash';
import * as fs from 'fs';
import { S3ACL } from './helpers/enums/s3-acl.enum';
import { S3UrlType } from './helpers/enums/s3-url-type.enum';

export class DlnS3 {
    private readonly BUCKET: string;
    private readonly REGION: string;
    private readonly CDN_URL?: string;

    private constructor(credentials: S3Credentials) {
        this.BUCKET = credentials.bucket;
        this.REGION = credentials.region;
        this.CDN_URL = credentials.cdn_url;

        AWS.config.update({
            accessKeyId: credentials.key,
            secretAccessKey: credentials.secret
        });
    }

    static create(credentials: S3Credentials): DlnS3 {
        return new DlnS3(credentials);
    }

    getFullURL(
      namespace: string,
      directory?: string,
      urlType = S3UrlType.NORMAL,
      keyPosition = S3UrlKeyPosition.PARAM // Ignored in case of S3UrlType.CDN
    ): string {
        return `${this.getBaseURL(urlType, keyPosition)}${this.getRelativePath(namespace, directory)}`
    }

    // Doesn't Include Trailing slashes
    getBaseURL(
      urlType = S3UrlType.NORMAL,
      keyPosition = S3UrlKeyPosition.PARAM // Ignored in case of S3UrlType.CDN
    ): string {
        if (urlType === S3UrlType.CDN) {
            const baseURL = this.CDN_URL

            if (!baseURL) {
                console.error('[DlnS3] Service not initialised with CDN')
                throw 'Service not initialised with CDN'
            }

            return baseURL;
        }

        const _tld = keyPosition === S3UrlKeyPosition.TLD ?  `${this.BUCKET}.` : '';
        const _param = keyPosition === S3UrlKeyPosition.PARAM ? `${this.BUCKET}` : '';

        const _s3Domain = urlType === S3UrlType.ACCELERATED ? 's3-accelerate.' : 's3.' + this.REGION;

        return 'https://' + _tld + _s3Domain + '.amazonaws.com/' + _param;
    }

    // Includes leading Slashes
    getRelativePath(
      namespace: string,
      directory?: string
    ): string {
        return  `/${this.getRelativeUrl(namespace, directory)}`
    }

    // Includes Trailing slashes
    /**
    * @deprecated Use getBaseURL()
    */
    getRootUrl({
                   isAccelerated = false,
                   keyPosition = S3UrlKeyPosition.PARAM
               } = {}): string {
        const _tld = keyPosition === S3UrlKeyPosition.TLD ?  `${this.BUCKET}.` : '';
        const _param = keyPosition === S3UrlKeyPosition.PARAM ? `${this.BUCKET}/` : '';

        const _s3Domain = isAccelerated ? 's3-accelerate' : 's3.' + this.REGION;

        return 'https://' + _tld + _s3Domain + '.amazonaws.com/' + _param;
    }

    // Excludes leading Slashes
    /**
     * @deprecated Use getRelativePath()
     */
    getRelativeUrl(namespace: string, directory?: string): string {
        let relativeUrl = namespace;

        if (directory) {
            relativeUrl = directory + '/' + relativeUrl;
        }

        return relativeUrl;
    }

    getSignedUrl(operation: S3Operation, namespace: string, config: S3UploadConfig, expiresIn: number = 60 * 5): string {
        const _s3Agent = new AWS.S3({
            region: this.REGION,
            signatureVersion: 'v4'
        });

        const s3Config = {
            Bucket: this.BUCKET,
            Key: this.getRelativeUrl(namespace, config.directory),
            Expires: expiresIn
        };

        if (config.acl) {
            s3Config['ACL'] = config.acl;
        }

        if (config.contentType) {
            s3Config['ContentType'] = config.contentType;
        }

        if (config.customMeta) {
            // Compatible with S3
            s3Config['Metadata'] = _.mapKeys(config.customMeta, function (value, key) {
                return 'x-amz-meta-' + key;
            });
        }
        return _s3Agent.getSignedUrl(operation, s3Config);
    }

    async upload(data: Buffer | Uint8Array | string | stream.Readable, namespace: string, config: S3UploadConfig = {}): Promise<any> {
        return this._upload(data, namespace, config);
    }

    async uploadStream(readStream: stream.Stream, namespace: string, config: S3UploadConfig): Promise<any> {
        const s3Stream = new stream.PassThrough();

        const s3Promise = this._upload(s3Stream, namespace, config);

        readStream.pipe(s3Stream);

        return s3Promise;
    }

    async copy(
        sourceNamespace: string,
        destNamespace: string,
        acl?: S3ACL,
        sourceDirectory?: string,
        destDirectory?: string,
        sourceBucket: string = this.BUCKET,
        destinationBucket: string = this.BUCKET
    ) {
        const _s3Agent = new AWS.S3({
            region: this.REGION
        });

        return _s3Agent.copyObject({
            ACL: acl,
            Bucket: destinationBucket,
            CopySource: `/${sourceBucket}/${this.getRelativeUrl(sourceNamespace, sourceDirectory)}`,
            Key: this.getRelativeUrl(destNamespace, destDirectory)
        }).promise();
    }

    async changeACL(acl: S3ACL, namespace: string, directory?: string): Promise<any> {
        const _s3Agent = new AWS.S3({
            region: this.REGION
        });

        return _s3Agent.putObjectAcl({
            ACL: acl,
            Bucket: this.BUCKET,
            Key: this.getRelativeUrl(namespace, directory)
        }).promise();
    }

    async download(filePath: string, namespace: string, directory?: string): Promise<any> {
        const _s3Agent = new AWS.S3({
            region: this.REGION
        });

        const fileWriteStream = fs.createWriteStream(filePath);

        const s3ReadStream = _s3Agent.getObject({
            Bucket: this.BUCKET,
            Key: this.getRelativeUrl(namespace, directory)
        }).createReadStream();

        return new Promise(((resolve, reject) => {
            s3ReadStream
                .on('error', (error) => {
                    // Catching error that occurred while reading from S3.
                    reject(error);
                })
                .pipe(fileWriteStream)
                .on('close', () => {
                    resolve();
                })
                .on('error', (error) => {
                    // Catching error that occurred while writing to local file.
                    // TODO Check if stream needs to be closed...
                    reject(error);
                });
        }));
    }

    async delete(namespace: string, directory?: string): Promise<any> {
        const _s3Agent = new AWS.S3({
            region: this.REGION
        });

        return _s3Agent.deleteObject({
            Bucket: this.BUCKET,
            Key: this.getRelativeUrl(namespace, directory)
        }).promise();
    }

    private async _upload(
        data: Buffer | Uint8Array | string | stream.Readable | stream.PassThrough,
        namespace: string,
        config: S3UploadConfig = {}
    ): Promise<any> {
        const _s3Agent = new AWS.S3({
            region: this.REGION
        });

        const s3UploadConfig: AWS.S3.PutObjectRequest = {
            Bucket: this.BUCKET,
            Key: this.getRelativeUrl(namespace, config.directory),
            Body: data,
        };

        if (config.acl) {
            s3UploadConfig.ACL = config.acl;
        }
        if (config.contentType) {
            s3UploadConfig.ContentType = config.contentType;
        }
        if (config.customMeta) {
            // Compatible with S3
            s3UploadConfig.Metadata = _.mapKeys(config.customMeta, function (value, key) {
                return 'x-amz-meta-' + key;
            });
        }

        return _s3Agent.upload(s3UploadConfig).promise();
    }
}
