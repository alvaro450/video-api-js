import { Injectable } from '@nestjs/common';
import { join } from 'path';
import * as ffmpeg from 'ffmpeg';
import * as fetch from 'node-fetch';
import { promises as fs } from 'fs';

const THUMBNAIL_PATH = `${process.cwd()}/thumbnails`;
const VIDEO_PATH = `${process.cwd()}/videos`;

@Injectable()
export class AppService {
  async getThumbnailFromVideo(url: string) {
    const decodedUrl = this._decodeValue(url);
    const timestamp = Date.now();
    // file names to be used to persist files to disk
    const thumbnailFileName = `thumbnail-${timestamp}.jpeg`;
    const videoFullFileName = join(VIDEO_PATH, `video-${timestamp}.mp4`);
    // download the video to local system
    await this._downloadVideoFile(decodedUrl, videoFullFileName);
    // get thumbnail from video on disk
    const base64Thumbnail = await this._getThumbnailFromVideo(
      decodedUrl,
      videoFullFileName,
      thumbnailFileName,
    );
    return base64Thumbnail;
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
          // write the video to disk
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

  /**
   * @description create the thumbnail from local video file, and return it as a base64 encoded image
   * @param url
   * @param videoFullFileName
   * @param thumbnailFileName
   * @returns
   */
  private async _getThumbnailFromVideo(
    url: string,
    videoFullFileName: string,
    thumbnailFileName: string,
  ): Promise<{ imageText: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        // ffmpeg has to be installed in the OS
        // using ffmpeg to process the video
        const video = await new ffmpeg(videoFullFileName);

        // place the thumbnail in the thumbnails folder, just do one frame capture
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

            // read the created thumbnail into memory as base64
            const base64Image = await fs.readFile(files[files.length - 1], {
              encoding: 'base64',
            });

            // pass the in-memory image to be returned to the client
            resolve({ imageText: `data:image/jpeg;base64, ${base64Image}` });
          },
        );
      } catch (error) {
        console.error(`Unable to process video from url: ${url}`, error);
        reject(error);
      }
    });
  }
}
