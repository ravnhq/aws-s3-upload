/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as core from '@actions/core'
import S3 from 'aws-sdk/clients/s3'
import fs from 'fs'
import mime from 'mime'
import path from 'path'

const destinationDir = core.getInput('destination-dir')
const sourceDir = core.getInput('source-dir')
const accessKeyId = core.getInput('access-key-id')
const secretAccessKey = core.getInput('secret-access-key')
const bucket = core.getInput('bucket')
const contentDisposition = core.getInput('content-disposition')
const acl = core.getInput('acl')

const s3 = new S3({
  accessKeyId,
  secretAccessKey
})

async function upload(params: S3.PutObjectRequest) {
  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        return reject(err)
      }
      resolve(data.Location)
    })
  })
}

async function run() {
  try {
    const paths = fs.readdirSync(sourceDir)
    const locations = await Promise.all(
      paths.map(async p => {
        const filePath = path.join(sourceDir, p)
        const fileStream = fs.createReadStream(filePath)
        const bucketPath = path.join(
          destinationDir,
          path.relative(sourceDir, filePath)
        )
        const params = {
          Bucket: bucket,
          ACL: acl,
          Body: fileStream,
          Key: bucketPath,
          ContentType: mime.getType(p)!,
          ContentDisposition: contentDisposition
        }
        return upload(params)
      })
    )

    core.info(`object key - ${destinationDir}`)
    core.info(`object locations - ${locations}`)
    core.setOutput('object_key', destinationDir)
    core.setOutput('object_locations', locations)
  } catch (error: unknown) {
    if (error instanceof Error || typeof error === 'string') {
      core.error(error)
    }
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
