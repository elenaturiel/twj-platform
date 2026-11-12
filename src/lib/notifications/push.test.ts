import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import webpush from "web-push";
// @ts-expect-error -- sin tipos; es la librería que usa web-push para cifrar
import ece from "http_ece";

describe("push web", () => {
  it("el aviso sale firmado (VAPID) y cifrado para el móvil, y el móvil lo puede leer", () => {
    const vapid = webpush.generateVAPIDKeys();
    const device = crypto.createECDH("prime256v1");
    device.generateKeys();
    const authSecret = crypto.randomBytes(16);
    const payload = JSON.stringify({ title: "Notificación de prueba ✅", body: "Funciona", link: "/hoy" });

    const req = webpush.generateRequestDetails(
      {
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        keys: { p256dh: device.getPublicKey().toString("base64url"), auth: authSecret.toString("base64url") },
      },
      payload,
      {
        vapidDetails: {
          subject: "mailto:hola@trainwithjaime.es",
          publicKey: vapid.publicKey,
          privateKey: vapid.privateKey,
        },
      },
    );
    expect(req.method).toBe("POST");
    expect(req.headers["Content-Encoding"]).toBe("aes128gcm");
    expect(String(req.headers.Authorization)).toMatch(/^vapid t=.+, k=/);
    const plain = ece.decrypt(req.body as Buffer, { version: "aes128gcm", privateKey: device, authSecret });
    expect(JSON.parse(plain.toString())).toEqual({
      title: "Notificación de prueba ✅",
      body: "Funciona",
      link: "/hoy",
    });
  });
});
