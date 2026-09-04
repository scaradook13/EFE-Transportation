import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getWebAuthnConfig, getChallengeStorage } from '~~/server/utils/webauthn';
import { Driver } from '~~/server/models/Driver';
import jwt from 'jsonwebtoken';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const body = await readBody(event);
  
  if (!body.driverId || !body.response) {
    throw createError({ statusCode: 400, message: 'Driver ID and response are required' });
  }

  const driver = await Driver.findById(body.driverId);
  if (!driver || !driver.fingerprint || !driver.fingerprint.registered) {
    throw createError({ statusCode: 400, message: 'Driver does not have a registered fingerprint' });
  }

  const storage = getChallengeStorage();
  const expectedChallenge = await storage.getItem(`auth-${driver._id}`) as string;
  if (!expectedChallenge) throw createError({ statusCode: 400, message: 'Authentication challenge expired or missing' });

  const { rpID, origin } = getWebAuthnConfig();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: new Uint8Array(Buffer.from(driver.fingerprint.credentialID, 'base64url')),
        credentialPublicKey: new Uint8Array(Buffer.from(driver.fingerprint.credentialPublicKey, 'base64url')),
        counter: driver.fingerprint.counter,
      },
    });
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message });
  }

  const { verified, authenticationInfo } = verification;
  if (!verified) {
    throw createError({ statusCode: 400, message: 'Fingerprint verification failed' });
  }

  // Update counter to prevent replay attacks
  driver.fingerprint.counter = authenticationInfo.newCounter;
  await driver.save();
  await storage.removeItem(`auth-${driver._id}`);

  // Generate a short-lived token specifically for biometric authorization (5 minutes)
  const config = useRuntimeConfig();
  const biometricToken = jwt.sign(
    { driverId: driver._id.toString(), type: 'fingerprint_auth' },
    config.jwtSecret,
    { expiresIn: '5m' }
  );

  return { success: true, biometricToken };
});
