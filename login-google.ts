import qrcode from "qrcode-terminal";
import { GoogleContact } from "./lib/google-contact";
import { Helper } from "./utils/helper";

const service = new GoogleContact(false);

(async () => {
  const urlLogin = await service.login();
  qrcode.generate(urlLogin, { small: true }, (qrcode) => {
    console.log(qrcode);
  });
  console.info(urlLogin);

  const prompt = "Enter callback url: ";
  process.stdout.write(prompt);
  for await (const line of console) {
    const code = Helper.getAuthCode(line);
    if (!code) {
      console.error("Invalid callback url query code is required");
      process.stdout.write(prompt);
    } else {
      await service.validate(code);
      console.info("Login google success");
      process.exit();
    }
  }
})();
