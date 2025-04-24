const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("./s3");

const storage = multer.memoryStorage();

// Configure multer with increased file size limits
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10 // Maximum 10 files per request
  }
});

const uploadToS3 = async (req, res, next) => {
  try {
    // Handle multer fields format (req.files is an object with field names as keys)
    if (req.files) {
      // Process each field (images, video, etc.)
      for (const [fieldName, files] of Object.entries(req.files)) {
        // Process each file in the field
        for (const file of files) {
          const folderName = "properties";
          const resourceType = file.mimetype.startsWith("video") ? "videos" : "images";
          const fileName = `${folderName}/${resourceType}/${Date.now()}-${file.originalname}`;

          const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
          };

          try {
            const result = await s3.send(new PutObjectCommand(uploadParams));
            file.url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
            console.log(`Uploaded ${fieldName} file:`, file.url);
          } catch (uploadError) {
            console.error(`Error uploading ${fieldName} file:`, uploadError);
            throw uploadError; // Re-throw to be caught by the outer try-catch
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error("Error uploading to S3:", error);
    res.status(500).json({ message: "Error uploading files", error: error.message });
  }
};

module.exports = { upload, uploadToS3 };