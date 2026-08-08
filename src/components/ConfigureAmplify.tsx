"use client";

import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

try {
  Amplify.configure(outputs as any, { ssr: true });
} catch (e) {
  console.warn("Amplify configuration warning:", e);
}

export default function ConfigureAmplifyClientSide() {
  return null;
}
