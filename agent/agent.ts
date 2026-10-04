import { defineAgent } from "eve";
import { anthropic } from "eve/models/anthropic";

export default defineAgent({
  model: anthropic("zai-org/GLM-5.3-Flash"),
  reasoning: "low",
});
