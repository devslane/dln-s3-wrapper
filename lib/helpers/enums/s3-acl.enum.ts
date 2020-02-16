export enum S3ACL {
    PRIVATE = 'private',
    PUBLIC_READ = 'public-read',
    PUBLIC_READ_WRITE = 'public-read-write',
    AUTHENTICATED_READ = 'authenticated-read',
    AWS_EXEC_READ = 'aws-exec-read',
    BUCKET_OWNER_READ = 'bucket-owner-read',
    BUCKET_OWNER = 'bucket-owner-full-control'
}
