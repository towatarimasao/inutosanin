// backfill-slugs.js
// generate-slugs.js と同じロジックでスラッグを生成し、spots.slug列へ書き込む。
//
// 実行方法:
//   ドライラン（デフォルト、DB書き込みなし）:
//     node scripts/backfill-slugs.js
//   実際に書き込む場合（1件ずつUPDATE、失敗したidで停止）:
//     node scripts/backfill-slugs.js --apply
//
// 安全策:
//   - --apply を明示指定しない限り、書き込みは一切行わない
//   - 既にslugが設定済み（NULLでない）行は、生成結果と一致すればスキップ、
//     不一致なら手動編集の可能性があるとみなしスキップして警告する（--force で上書き可）
//   - 1件ずつUPDATEし、エラーが出たら直ちに停止してどのidで失敗したかを表示する

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { fetchTargetSpots, createKuroshiro, computeSlugRows } = require("./generate-slugs");

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );
}

async function main() {
  // 読み取りはanon keyで十分（generate-slugs.jsと同条件で取得）
  const readClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const spots = await fetchTargetSpots(readClient);
  const kuroshiro = await createKuroshiro();
  const rows = await computeSlugRows(spots, kuroshiro);

  // 現在のslug値を取得し、書き込み要否を判定する
  const { data: currentSlugs, error: currentSlugsError } = await readClient
    .from("spots")
    .select("id, slug")
    .in("id", rows.map((r) => r.id));
  if (currentSlugsError) {
    console.error("[backfill-slugs] 現在のslug取得失敗:", currentSlugsError.message);
    process.exit(1);
  }
  const currentSlugById = new Map(currentSlugs.map((s) => [s.id, s.slug]));

  const toInsert = [];
  const alreadySet = [];
  const conflicting = [];

  for (const row of rows) {
    const current = currentSlugById.get(row.id) ?? null;
    if (current === null) {
      toInsert.push(row);
    } else if (current === row.generated_slug) {
      alreadySet.push(row);
    } else {
      conflicting.push({ ...row, current_slug: current });
    }
  }

  console.log(`対象件数: ${rows.length}`);
  console.log(`新規書き込み対象: ${toInsert.length}`);
  console.log(`既に同一slug設定済み（スキップ）: ${alreadySet.length}`);
  console.log(`既存slugと生成結果が不一致（${FORCE ? "上書きします" : "スキップ、--forceで上書き可"}）: ${conflicting.length}`);

  if (conflicting.length > 0) {
    console.log("--- 不一致の詳細 ---");
    for (const c of conflicting) {
      console.log(`  ${c.id} | ${c.name} | 既存: ${c.current_slug} | 生成: ${c.generated_slug}`);
    }
  }

  const targets = FORCE ? [...toInsert, ...conflicting] : toInsert;

  if (!APPLY) {
    console.log("");
    console.log("=== ドライラン結果（--apply未指定のためDB書き込みは行っていません） ===");
    console.log(`書き込み予定件数: ${targets.length}`);
    for (const t of targets.slice(0, 20)) {
      console.log(`  ${t.id} | ${t.name} | -> ${t.generated_slug}`);
    }
    if (targets.length > 20) console.log(`  ...他 ${targets.length - 20} 件`);
    console.log("");
    console.log("内容に問題なければ次を実行してください: node scripts/backfill-slugs.js --apply");
    return;
  }

  if (targets.length === 0) {
    console.log("書き込み対象がありません。終了します。");
    return;
  }

  console.log("");
  console.log(`=== 書き込み開始（${targets.length}件、1件ずつUPDATE） ===`);
  const writeClient = getServiceClient();
  let done = 0;

  for (const t of targets) {
    const { error } = await writeClient
      .from("spots")
      .update({ slug: t.generated_slug })
      .eq("id", t.id);

    if (error) {
      console.error("");
      console.error(`[backfill-slugs] UPDATE失敗。id=${t.id} (${t.name}) で停止しました。`);
      console.error(`エラー内容: ${error.message}`);
      console.error(`ここまでの成功件数: ${done} / ${targets.length}`);
      process.exit(1);
    }

    done += 1;
    if (done % 25 === 0 || done === targets.length) {
      console.log(`  ${done} / ${targets.length} 件完了`);
    }
  }

  console.log(`=== 完了: ${done}件すべて書き込みました ===`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
