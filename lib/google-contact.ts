import { people } from "@googleapis/people";
import { OAuth2Client } from "google-auth-library";
import keys from "../credentials.json";
import { logger } from "./logger";

const oAuth2Client = new OAuth2Client({
  clientId: keys.installed.client_id,
  clientSecret: keys.installed.client_secret,
  redirectUri: keys.installed.redirect_uris[0],
});
oAuth2Client.on("tokens", async (tokens) => {
  console.log(tokens);
  await Bun.write("token.json", JSON.stringify(tokens));
});

export class GoogleContact {
  private access_type: string = "offline";
  private scope: string[] = ["https://www.googleapis.com/auth/contacts"];
  private prompt: string = "consent";

  constructor(init = true) {
    if (init) {
      this.init();
    }
  }

  async init() {
    try {
      const file = Bun.file("token.json");
      const credentials = await file.json();
      oAuth2Client.setCredentials(credentials);
      logger.info("Set google credentials success");
    } catch (err: any) {
      logger.error(err.message);
    }
  }

  async login() {
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: this.access_type,
      scope: this.scope,
      prompt: this.prompt,
    });
    return authorizeUrl;
  }

  async validate(code: string) {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
  }

  async search(query: string) {
    const service = people({ version: "v1", auth: oAuth2Client });
    const res = await service.people.searchContacts({
      query,
      readMask: "names,phoneNumbers,emailAddresses",
    });
    return res.data;
  }

  async create({ name, phoneNumber }: { name: string; phoneNumber: string }) {
    const service = people({ version: "v1", auth: oAuth2Client });
    const res = await service.people.createContact({
      requestBody: {
        names: [{ givenName: name }],
        phoneNumbers: [{ value: phoneNumber }],
      },
    });
    return res.data;
  }
}
