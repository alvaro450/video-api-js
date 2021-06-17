import { Injectable } from '@nestjs/common';
import { join } from 'path';
import * as ffmpeg from 'ffmpeg';
import * as fetch from 'node-fetch';
import { promises as fs } from 'fs';

const THUMBNAIL_PATH = `${process.cwd()}/thumbnails`;
const VIDEO_PATH = `${process.cwd()}/videos`;

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getThumbnailFromVideo(url: string) {
    const decodedUrl = this._decodeValue(url);
    const timestamp = Date.now();
    const thumbnailFileName = `thumbnail-${timestamp}.jpeg`;
    const videoFullFileName = join(VIDEO_PATH, `video-${timestamp}.mp4`);
    // download the video to local system
    await this._downloadVideoFile(decodedUrl, videoFullFileName);
    // get thumbnail from
    return this._getThumbnailFromVideo(
      decodedUrl,
      videoFullFileName,
      thumbnailFileName,
    );
  }

  /**
   * @description download the video file locally
   * @param url
   * @param videoFullFileName
   * @returns Promise
   */
  private async _downloadVideoFile(url: string, videoFullFileName: string) {
    try {
      const fileResponse = await fetch(url);
      const buffer = await fileResponse.buffer();
      return new Promise(async (resolve, reject) => {
        try {
          await fs.writeFile(videoFullFileName, buffer);
          resolve(null);
        } catch (e) {
          console.error('Unable to write file to local ', e);
          reject(e);
        }
      });
    } catch (error) {
      console.error('Unable to download file at: ' + url, error);
      Promise.reject();
    }
  }

  private _decodeValue(value: string): string {
    return decodeURIComponent(value);
  }

  private async _getThumbnailFromVideo(
    url: string,
    videoFullFileName: string,
    thumbnailFileName: string,
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const video = await new ffmpeg(videoFullFileName);

        // place the thumbnail in the temp folder
        video.fnExtractFrameToJPG(
          THUMBNAIL_PATH,
          {
            frame_rate: 1,
            number: 1,
            file_name: thumbnailFileName,
          },
          async (error, files) => {
            if (error) {
              return reject(error);
            }

            console.log('FILES', files);
            // read it into memory
            const base64Image = await fs.readFile(
              join(THUMBNAIL_PATH, `${thumbnailFileName}`),
              {
                encoding: 'base64',
              },
            );

            // pass the inmemory image to be returned to the client
            resolve(base64Image);
          },
        );
      } catch (error) {
        console.error(`Unable to process video from url: ${url}`, error);
        reject(error);
      }

      resolve(null);
    });
  }
}
