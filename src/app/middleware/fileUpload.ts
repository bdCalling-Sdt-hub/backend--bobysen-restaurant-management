import { Request } from "express";
import multer, { memoryStorage } from "multer";
const fileUpload = (folder?: string) => {
  const upload = multer({
    storage: memoryStorage(),
    limits: {
      fileSize: 20000000,
    },

    fileFilter: function (req: Request, file, cb) {
      if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg" ||
        file.mimetype === "image/svg" ||
        file.mimetype === "image/webp" ||
        file.mimetype === "application/octet-stream" ||
        file.mimetype === "image/svg+xml"
      ) {
        cb(null, true);
      } else {
        cb(null, false);
        throw new Error("only png,jpg,jpeg,svg format allowed");
      }
    },
  });
  return upload;
};

export const upload = fileUpload();
export default fileUpload;

//
