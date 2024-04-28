const asyncHandler = (requestHandler) => {
   return (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next))
        .catch((error) => next(error))
    }
}


export {asyncHandler}


// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
                 // Sets the 'success' field in the JSON response to 'false'.
//             success: false,
                // Sets the 'message' field in the JSON response to the error message.
//             message: error.message
//         })
//     }
        // ----------------->   // This block catches any errors that occur within the try block.
    
    // res.status(code): Sets the HTTP status code of the response.
    // error.code: Assuming the error object has a 'code' property, it checks if it exists.
    // If 'code' property exists in the error object, it uses that value as the status code.
    // If 'code' property doesn't exist, it defaults to 500 (Internal Server Error).
    // res.status(error.code || 500): Sets the HTTP status code of the response.
    // json({}): Sends a JSON response with the specified payload.

// }




