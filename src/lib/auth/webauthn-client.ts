"use client";

/**
 * Base64URL string to ArrayBuffer converter
 */
export function base64urlToBuffer(base64url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

/**
 * ArrayBuffer / Uint8Array to Base64URL string converter
 */
export function bufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Checks if the current browser and device support biometric/fingerprint authentication
 */
export async function isBiometricsSupported(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !window.PublicKeyCredential
  ) {
    return false;
  }

  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Registers a new fingerprint or biometric credential for the logged-in user
 */
export async function registerBiometricDevice(): Promise<{
  success: boolean;
  message: string;
}> {
  const isSupported = await isBiometricsSupported();
  if (!isSupported) {
    throw new Error(
      "এই ডিভাইসে বা ব্রাউজারে ফিঙ্গারপ্রিন্ট / বায়োমেট্রিক সেন্সর পাওয়া যায়নি বা সমর্থিত নয়।"
    );
  }

  // 1. Get registration options from server
  const optRes = await fetch("/api/v1/auth/webauthn/register-options", {
    method: "POST",
  });
  const optData = await optRes.json();
  if (!optData.success || !optData.options) {
    throw new Error(optData.error || "নিবন্ধন বিকল্প তৈরিতে ত্রুটি");
  }

  const { options } = optData;

  // 2. Prepare publicKey creation options
  const createOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64urlToBuffer(options.challenge),
    rp: options.rp,
    user: {
      ...options.user,
      id: base64urlToBuffer(options.user.id),
    },
    pubKeyCredParams: options.pubKeyCredParams,
    authenticatorSelection: options.authenticatorSelection,
    timeout: options.timeout,
    attestation: options.attestation,
    excludeCredentials: (options.excludeCredentials || []).map((c: any) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    })),
  };

  // 3. Trigger native device biometric prompt (Windows Hello / Android Fingerprint / Touch ID)
  const credential = (await navigator.credentials.create({
    publicKey: createOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error("ফিঙ্গারপ্রিন্ট রিডিং বাতিল করা হয়েছে।");
  }

  const attestationResponse =
    credential.response as AuthenticatorAttestationResponse;

  // 4. Send credential to server for verification and storage
  const verifyRes = await fetch("/api/v1/auth/webauthn/register-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      response: {
        clientDataJSON: bufferToBase64url(attestationResponse.clientDataJSON),
        attestationObject: bufferToBase64url(
          attestationResponse.attestationObject
        ),
      },
      deviceName: window.navigator.userAgent.includes("Windows")
        ? "Windows Hello / Counter PC"
        : window.navigator.userAgent.includes("Android")
          ? "Android Fingerprint"
          : "Biometric Scanner",
    }),
  });

  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    throw new Error(verifyData.error || "বায়োমেট্রিক সংরক্ষণ ব্যর্থ হয়েছে");
  }

  return { success: true, message: verifyData.message };
}

/**
 * Authenticates user using fingerprint / biometric scan
 */
export async function authenticateBiometric(userId?: string): Promise<{
  success: boolean;
  user?: any;
  message?: string;
}> {
  const isSupported = await isBiometricsSupported();
  if (!isSupported) {
    throw new Error("এই ডিভাইসে বায়োমেট্রিক সেন্সর পাওয়া যায়নি।");
  }

  // 1. Get authentication options
  const optRes = await fetch("/api/v1/auth/webauthn/login-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const optData = await optRes.json();
  if (!optData.success || !optData.options) {
    throw new Error(optData.error || "লগইন বিকল্প তৈরিতে ত্রুটি");
  }

  const { options } = optData;

  // 2. Prepare assertion options
  const getOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64urlToBuffer(options.challenge),
    timeout: options.timeout,
    userVerification: options.userVerification,
    allowCredentials: (options.allowCredentials || []).map((c: any) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    })),
  };

  // 3. Trigger native device fingerprint scan
  let assertion: PublicKeyCredential;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: getOptions,
    })) as PublicKeyCredential;
  } catch (err: any) {
    if (
      err.name === "NotAllowedError" ||
      (err.message && (err.message.includes("not allowed") || err.message.includes("timed out")))
    ) {
      throw new Error(
        "ফিঙ্গারপ্রিন্ট স্ক্যান বাতিল হয়েছে অথবা এই ডিভাইসে কোনো পাসকি পাওয়া যায়নি। অনুগ্রহ করে পিন দিয়ে প্রবেশ করে ফিঙ্গারপ্রিন্ট যুক্ত করুন।"
      );
    }
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      throw new Error("ফিঙ্গারপ্রিন্ট স্ক্যান করার সময় শেষ হয়ে গেছে। পুনরায় চেষ্টা করুন।");
    }
    throw err;
  }

  if (!assertion) {
    throw new Error("ফিঙ্গারপ্রিন্ট স্ক্যান বাতিল করা হয়েছে।");
  }

  const assertionResponse = assertion.response as AuthenticatorAssertionResponse;

  // 4. Verify assertion on server and issue session
  const verifyRes = await fetch("/api/v1/auth/webauthn/login-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: assertion.id,
      rawId: bufferToBase64url(assertion.rawId),
      response: {
        clientDataJSON: bufferToBase64url(assertionResponse.clientDataJSON),
        authenticatorData: bufferToBase64url(
          assertionResponse.authenticatorData
        ),
        signature: bufferToBase64url(assertionResponse.signature),
        userHandle: assertionResponse.userHandle
          ? bufferToBase64url(assertionResponse.userHandle)
          : null,
      },
    }),
  });

  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    throw new Error(verifyData.error || "ফিঙ্গারপ্রিন্ট মেলেনি!");
  }

  return {
    success: true,
    user: verifyData.user,
    message: verifyData.message,
  };
}
