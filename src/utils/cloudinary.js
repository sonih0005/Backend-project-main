import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET, 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //upload the file on cloudinary
      const response =  await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //file has been uploaded successfully
        //console.log("file  is uploaded on cloudinary",response.url);
        //console.log(response)
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async (publicIds)=>{
    try {
        if(!publicIds) return null;
        const deleteImage = await cloudinary.api.delete_resources(
            publicIds,
            {
                resource_type: "auto",
                type: "upload"
            }
        )

    } catch (error) {
        console.log("Error while deleting from cloudinary", error);
        return null
    }
}

export {uploadOnCloudinary, deleteFromCloudinary}