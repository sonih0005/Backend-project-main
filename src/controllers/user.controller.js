import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const options = {
  httpOnly: true,
  secure: true,
 };

const generateAccessAndRefreshTokens = async(userId) => {
  try {
   const user = await User.findById(userId)
   const accessToken =  user.generateAccessToken()
   //console.log(accessToken)
   const refreshToken = user.generateRefreshToken()
   //console.log(refreshToken)
   

   user.refreshToken = refreshToken;
   await user.save({validateBeforeSave: false})

   return {accessToken, refreshToken}



  } catch (error) {
    throw new ApiError(500, "something went wrong while generating Access and Refresh token")
  }
}

const registerUser = asyncHandler( async (req,res)=> {
  //user register steps---------->
  //get user details from frontend
  //validation -not empty 
  //check if user already exists: username, email
  //check for images: avatar
  //upload them to cloudinary, avatar
  //create user object - create entry in DB
  //remove password and refresh token field from response
  //check for user creation
  //return res

  //console.log(req.body)
  //console.log(user)
  //console.log(User)
  const {fullName, username, email, password} = req.body
  //console.log(`${email} ${username} `)

  if(
    [fullName, username,email,password].some((field)=> field?.trim() === "")
  ){
    throw new ApiError(400, "All fields are required")
  }

  const existedUser = await User.findOne({
    $or: [{ username },{ email }]
  })
  if(existedUser){
    throw new ApiError(409,"Username and email is already exist")
  }

  //console.log(req.files.avatar[0])
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //console.log(req.files)
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  
  // let coverImageLocalPath;
  // if(req.files && Array.isArray(req.coverImage) && req.files.coverImage.length > 0){
  //   coverImageLocalPath = req.files.coverImage[0].path
  // }

  if(!avatarLocalPath){
    throw new ApiError(400, "avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar){
    throw new ApiError(400, "avatar file is required")
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
    email,
    password
  })
  console.log(user)

 const createdUser = await User.findById(user._id).select(
    "-password -refreshToken", 
 )

 if(!createdUser){
    throw new ApiError(500,"something went wrong while registering the user")
 }

return res.status(201).json(
    new ApiResponse(200, createdUser, "user registered successfully")
)

})

const loginUser = asyncHandler( async(req,res) => {
  //req body -> data
  //username or email login
  //find the user
  //check password
  //access and refresh token
  //send cookies

  //console.log(req.body)
  const {username, email, password} = req.body;

  if(!(username && email)){
    throw new ApiError(400, "username and email is required")
  }

   const user = await User.findOne({
    $or: [{username},{email}]
  })
  //console.log(user)

  if(!user){
    throw new ApiError(404, " user does not exist")
  }

  //console.log(user)
  //console.log(User)
  const isPasswordValid = await user.isPasswordCorrect(password)
  //console.log(isPasswordValid)
  if(!isPasswordValid){
    throw new ApiError(401, "please enter correct password")
  }

 const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

 const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

 return res.status(200)
 .cookie("accessToken",accessToken,options)
 .cookie("refreshToken",refreshToken,options)
 .json(
  new ApiResponse(200,
     {user: loggedInUser,accessToken,refreshToken},
     "user logged in successfully"
     )
 )
})

const logoutUser = asyncHandler( async(req,res) => {
   await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true,
    }
  )

   return res.status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {}, "user loged out"))
 })


 const refreshAccessToken = asyncHandler(async(req,res)=> {
   console.log(req)
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
    throw new ApiError(401, "unauthorized request")
   }

   try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
 
    const user = await User.findById(decodedToken?._id)
 
    if(!user){
     throw new ApiError( 401, " invalid refresh token")
    }
 
    if(incomingRefreshToken !== user?.refreshToken){
     throw new ApiError(401, "refresh token is expired or used")
    } 
 
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
 
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("newRefreshToken", newRefreshToken, options)
    .json(
     new ApiResponse(200,{
       accessToken,newRefreshToken
     },
      "access token refresh successfully"
     )
    )
   } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token")
   }

 })


 const changeCurrentPassword = asyncHandler (async(req,res)=> {
   const {oldPassword, newPassword} = req.body

   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

   if(!isPasswordCorrect){
    throw new ApiError(400, "Invalid old password")
   }

   user.password = newPassword

   await user.save({validateBeforeSave: false})

   return res.status(200)
  .json(new ApiResponse(200, {}, "password changed successfully")
)

 })

 const getCurrentUser = asyncHandler( async(req,res) => {
  return res.status(200)
  .json(200,req.user, "Current user fetched successfully" )
 })

 const updateAccountDetails = asyncHandler(async(req,res)=> {
 const {fullName, email } = req.body

 if(!fullName && ! email){
  throw new ApiError(400, "All fields are required")
 }

 const user = await User.findByIdAndUpdate(
  req.user?._id,
  {
    $set: {
      fullName,
      email,
    }
  },
  {new: true}
 ).select("-password -refreshToken")

 return res.status(200)
 .json(new ApiResponse(200, user, "Account details Updated successfully"))

 })

 const updateUserAvatar = asyncHandler(async(req,res)=> {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar =  await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading Avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      }
    },
    {
      new: true
    }
  ).select("-password")

  return res.status(200)
  .json(new ApiResponse(200, user, "Avatar is uploaded successfully"))
 })

 const updateUserCoverImage = asyncHandler(async(req,res)=> {
  const coverImageLocalPath = req.file?.path;

  if(!coverImageLocalPath){
    throw new ApiError(400, "coverImage file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading coverImage")
  }

  const user =await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage: coverImage.url,
      }
    },
    {new: true}
  ).select("-password")

  return res.status(200)
  .json(new ApiResponse(200, user, "coverImage is uploaded successfully"))
 })

export  {

  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserAvatar,
  updateUserCoverImage
}