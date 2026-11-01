import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "Daily pack path calls market_brief and save_content_pack.",
  async test(t) {
    await t.send(
      "Собери короткий дневной контент-пакет на сегодня. Используй market_brief и сохрани через save_content_pack. HeyGen можно пропустить, если нет ключей.",
    );
    t.succeeded();
    t.calledTool("market_brief");
    t.calledTool("save_content_pack");
  },
});
