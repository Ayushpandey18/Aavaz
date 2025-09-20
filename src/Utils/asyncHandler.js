const async_Handler=(request_handler)=>{return (req,res,next)=>{
    Promise.resolve(request_handler(req,res,next)).catch((err)=>next(err));
}
}
export default async_Handler;