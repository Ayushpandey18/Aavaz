// middlewares/errorHandler.js
import apierror from "../Utils/apierror.js";

const errorHandler = (err, req, res, next) => {
  if (err instanceof apierror) {
    return res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      errors: err.errors,
      data: err.data,
    });
  }

  // fallback for unhandled errors
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    err: err.errors
  });
};

export default errorHandler;
