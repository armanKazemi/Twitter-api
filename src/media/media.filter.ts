export const MediaFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|mp4|mkv)$/)) {
    return callback(new Error('This file format is not acceptable.'), false);
  }
  callback(null, true);
};
