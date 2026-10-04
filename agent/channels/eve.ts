import { eveChannel } from "eve/channels/eve";
import { localDev, none } from "eve/channels/auth";

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev`; never opens in production.
    localDev(),
    // The CMS proxies all chat traffic server-side via its edge function,
    // so the channel itself stays unreachable from the public browser.
    none(),
  ],
});
