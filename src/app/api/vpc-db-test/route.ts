import { NextResponse } from "next/server";

export async function GET() {
  try {
    const mongoVpcUrl = process.env.MONGO_VPC_URL;
    
    if (!mongoVpcUrl) {
      return NextResponse.json({
        success: false,
        message: "MONGO_VPC_URL environment variable is not configured yet.",
        instructions: "Please set MONGO_VPC_URL in AWS Amplify Console with your Function URL."
      }, { status: 400 });
    }

    const res = await fetch(mongoVpcUrl, { cache: "no-store" });
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to reach VPC MongoDB Function URL"
    }, { status: 500 });
  }
}
