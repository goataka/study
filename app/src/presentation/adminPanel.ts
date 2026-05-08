/**
 * 管理（admin）画面の描画を担う UI ヘルパー。
 * QuizApp から肥大化していた renderAdminContent を切り出したもの。
 *
 * クリーンアーキテクチャ上の位置付け:
 * - presentation 層に属し、QuizUseCase / IProgressRepository を介してのみアプリケーション層を利用する。
 */

import type { QuizUseCase } from "../application/quizUseCase";
import type { IProgressRepository } from "../application/ports";

/** AdminPanel が QuizApp 側に必要とする最小限の依存。 */
export interface AdminPanelDeps {
  useCase: QuizUseCase;
  progressRepo: IProgressRepository;
  /** 共有 URL（設定セクションのプレビュー表示用）。 */
  shareUrl: string;
  /** 確認ダイアログを表示し、OK されたら true を resolve する。 */
  showConfirmDialog: (message: string, alertOnly?: boolean) => Promise<boolean>;
}

/**
 * 全データを JSON ファイルとしてダウンロードする。
 * QuizApp.downloadUserData をそのまま外出ししたもの。
 */
export function downloadUserData(useCase: QuizUseCase): void {
  const data = useCase.exportAllData();
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `study-data-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

/**
 * 管理画面（カテゴリリスト領域＋adminContent 領域）を描画する。
 */
export function renderAdminContent(categoryList: HTMLElement, deps: AdminPanelDeps): void {
  const { useCase, progressRepo, shareUrl, showConfirmDialog } = deps;
  const data = useCase.exportAllData();

  /** 配列を先頭 N 件に絞り、件数サマリを付けた表示用値を返す */
  const truncateArray = (arr: unknown[], maxItems = 50): unknown => {
    if (arr.length <= maxItems) return arr;
    return [...arr.slice(0, maxItems), `... (${arr.length - maxItems}件省略、合計${arr.length}件)`];
  };

  /** ファイルダウンロード用の英字キー */
  type SectionKey = "settings" | "history" | "mastered" | "streaks";
  const sections: Array<{
    title: string;
    fileKey: SectionKey;
    editable: boolean;
    content: unknown;
    fullContent?: unknown;
  }> = [
    {
      title: "設定",
      fileKey: "settings",
      editable: false,
      content: {
        userName: data.userName ?? "ゲスト",
        fontSizeLevel: data.fontSizeLevel ?? "small",
        categoryViewMode: data.categoryViewMode,
        quizSettings: progressRepo.loadQuizSettings(),
        shareUrl: shareUrl || "(未設定)",
      },
    },
    {
      title: "履歴",
      fileKey: "history",
      editable: true,
      content: truncateArray(data.history),
      fullContent: data.history,
    },
    {
      title: "学習済み問題",
      fileKey: "mastered",
      editable: true,
      content: truncateArray(data.masteredIds),
      fullContent: data.masteredIds,
    },
    { title: "連続正解", fileKey: "streaks", editable: true, content: data.correctStreaks },
  ];

  // ─── トップメニュー ───────────────────────────────────────────────
  const menuBar = document.createElement("div");
  menuBar.className = "admin-menu-bar";

  const contentArea = document.createElement("div");
  contentArea.className = "admin-menu-content";

  let activeMenu: "manage" | "view" | null = null;

  // ── 🛢️データ管理セクション ────────────────────────────────────
  const showManageContent = (): void => {
    contentArea.innerHTML = "";
    contentArea.classList.remove("admin-data-open");
    contentArea.classList.add("admin-manage-open");
    // データ参照サブメニューを削除
    menuBar.querySelectorAll(".admin-view-submenu").forEach((el) => el.remove());

    // ── モバイル用：閉じるボタン行（デスクトップではCSSで非表示） ──────
    const closeRow = document.createElement("div");
    closeRow.className = "admin-manage-close-row";
    const closeTitle = document.createElement("span");
    closeTitle.className = "admin-data-header-title";
    closeTitle.textContent = "🛢️ データ管理";
    closeRow.appendChild(closeTitle);
    const closeBtn = document.createElement("button");
    closeBtn.className = "admin-data-close-btn";
    closeBtn.type = "button";
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "閉じる");
    closeBtn.addEventListener("click", () => {
      contentArea.classList.remove("admin-manage-open");
      contentArea.innerHTML = "";
      activeMenu = null;
      manageBtn.classList.remove("active");
      viewBtn.classList.remove("active");
    });
    closeRow.appendChild(closeBtn);
    contentArea.appendChild(closeRow);

    // ── タブバー ─────────────────────────────────────────────
    const tabBar = document.createElement("div");
    tabBar.className = "admin-manage-tabs";

    const tabPanelArea = document.createElement("div");
    tabPanelArea.className = "admin-manage-tab-panel";

    type ManageTab = "import" | "export" | "reset";
    const tabDefs: Array<{ id: ManageTab; label: string }> = [
      { id: "import", label: "📥 インポート" },
      { id: "export", label: "📤 エクスポート" },
      { id: "reset", label: "🗑️ 初期化" },
    ];

    const showTabContent = (tabId: ManageTab): void => {
      tabBar.querySelectorAll(".admin-manage-tab").forEach((t) => t.classList.remove("active"));
      const activeTab = tabBar.querySelector<HTMLButtonElement>(`.admin-manage-tab[data-tab="${tabId}"]`);
      if (activeTab) activeTab.classList.add("active");

      tabPanelArea.innerHTML = "";

      if (tabId === "import") {
        // ── インポートコンテンツ ────────────────────────────────
        const section = document.createElement("div");
        section.className = "admin-reset-section";

        const importDesc = document.createElement("p");
        importDesc.className = "admin-reset-desc";
        importDesc.textContent = "ダウンロードしたJSONファイルを選択して、学習データを更新します。";
        section.appendChild(importDesc);

        const fileLabel = document.createElement("label");
        fileLabel.className = "admin-import-label";
        fileLabel.textContent = "📂 JSONファイルを選択";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json,application/json";
        fileInput.className = "admin-import-input";
        fileInput.style.display = "none";

        const fileNameSpan = document.createElement("span");
        fileNameSpan.className = "admin-import-filename";
        fileNameSpan.textContent = "（未選択）";

        const previewEl = document.createElement("pre");
        previewEl.className = "admin-data";
        previewEl.style.marginTop = "8px";
        previewEl.style.display = "none";

        const applyBtn = document.createElement("button");
        applyBtn.className = "admin-import-apply-btn";
        applyBtn.type = "button";
        applyBtn.textContent = "✅ データを更新する";
        applyBtn.style.display = "none";

        let parsedData: unknown = null;
        let detectedFileKey: SectionKey | null = null;

        fileInput.addEventListener("change", () => {
          const file = fileInput.files?.[0];
          if (!file) return;
          fileNameSpan.textContent = file.name;
          const reader = new FileReader();
          reader.onload = (): void => {
            try {
              parsedData = JSON.parse(reader.result as string);
              // ファイル名からセクションを推定（例: study-history-2024-01-01.json）
              // settings はインポート対象外
              detectedFileKey = null;
              const importableSections = sections.filter((sec) => sec.fileKey !== "settings");
              for (const sec of importableSections) {
                if (file.name.includes(sec.fileKey)) {
                  detectedFileKey = sec.fileKey;
                  break;
                }
              }
              const preview = JSON.stringify(parsedData, null, 2);
              previewEl.textContent = preview.length > 2000 ? preview.slice(0, 2000) + "\n...(省略)" : preview;
              previewEl.style.display = "block";
              if (detectedFileKey) {
                applyBtn.textContent = `✅ ${sections.find((s) => s.fileKey === detectedFileKey)?.title ?? detectedFileKey} を更新する`;
                applyBtn.style.display = "block";
              } else if (file.name.includes("settings")) {
                previewEl.textContent = "設定ファイルのインポートは未対応です。\n\n" + previewEl.textContent;
                applyBtn.style.display = "none";
              } else {
                applyBtn.textContent = "✅ データを更新する（種類不明）";
                applyBtn.style.display = "block";
              }
            } catch {
              previewEl.textContent = "JSONの解析に失敗しました。ファイルを確認してください。";
              previewEl.style.display = "block";
              applyBtn.style.display = "none";
              parsedData = null;
            }
          };
          reader.readAsText(file);
        });

        applyBtn.addEventListener("click", () => {
          if (!parsedData || !detectedFileKey) {
            alert(
              "対応するデータ種類が判定できませんでした。ファイル名に history / mastered / streaks を含めてください。",
            );
            return;
          }
          // 基本バリデーション
          if ((detectedFileKey === "history" || detectedFileKey === "mastered") && !Array.isArray(parsedData)) {
            const label = sections.find((s) => s.fileKey === detectedFileKey)?.title ?? detectedFileKey;
            alert(`「${label}」データの形式が正しくありません（配列が必要です）。ファイルを確認してください。`);
            return;
          }
          if (
            detectedFileKey === "streaks" &&
            (typeof parsedData !== "object" || Array.isArray(parsedData) || parsedData === null)
          ) {
            const label = sections.find((s) => s.fileKey === detectedFileKey)?.title ?? detectedFileKey;
            alert(`「${label}」データの形式が正しくありません（オブジェクトが必要です）。ファイルを確認してください。`);
            return;
          }
          void showConfirmDialog(
            `「${sections.find((s) => s.fileKey === detectedFileKey)?.title ?? detectedFileKey}」データを選択したファイルの内容で上書きします。よろしいですか？`,
          )
            .then((confirmed) => {
              if (!confirmed) return;
              try {
                if (detectedFileKey === "history") {
                  progressRepo.saveHistory(parsedData as ReturnType<typeof progressRepo.loadHistory>);
                } else if (detectedFileKey === "mastered") {
                  progressRepo.saveMasteredIds(parsedData as string[]);
                } else if (detectedFileKey === "streaks") {
                  progressRepo.saveCorrectStreaks(parsedData as Record<string, number>);
                }
                void useCase
                  .initialize()
                  .then(() => {
                    window.location.reload();
                  })
                  .catch((err: unknown) => {
                    console.error("データ再読み込みに失敗しました", err);
                    alert("データの更新後の再読み込みに失敗しました。問題データを確認してください。");
                  });
              } catch (err) {
                console.error("データ更新に失敗しました", err);
                alert("データの更新に失敗しました。ファイルの形式を確認してください。");
              }
            })
            .catch((err: unknown) => {
              console.error("確認ダイアログでエラーが発生しました", err);
            });
        });

        fileLabel.appendChild(fileInput);
        section.appendChild(fileLabel);
        section.appendChild(fileNameSpan);
        section.appendChild(previewEl);
        section.appendChild(applyBtn);
        tabPanelArea.appendChild(section);
      } else if (tabId === "export") {
        // ── エクスポートコンテンツ ──────────────────────────────
        const section = document.createElement("div");
        section.className = "admin-reset-section";

        const exportDesc = document.createElement("p");
        exportDesc.className = "admin-reset-desc";
        exportDesc.textContent =
          "すべての学習データをJSONファイルとしてダウンロードします。定期的なバックアップにご利用ください。";
        section.appendChild(exportDesc);

        const exportBtn = document.createElement("button");
        exportBtn.className = "admin-import-apply-btn";
        exportBtn.type = "button";
        exportBtn.textContent = "⬇️ データをエクスポートする";
        exportBtn.style.marginTop = "8px";
        exportBtn.addEventListener("click", () => {
          downloadUserData(useCase);
        });
        section.appendChild(exportBtn);
        tabPanelArea.appendChild(section);
      } else if (tabId === "reset") {
        // ── 初期化コンテンツ ────────────────────────────────────
        const section = document.createElement("div");
        section.className = "admin-reset-section";

        const resetDesc = document.createElement("p");
        resetDesc.className = "admin-reset-desc";
        resetDesc.textContent = "すべての学習データ（履歴・学習済み・進捗）を削除します。";
        const resetBtn = document.createElement("button");
        resetBtn.className = "admin-reset-btn";
        resetBtn.type = "button";
        resetBtn.textContent = "🗑️ 全データを初期化する";
        resetBtn.addEventListener("click", () => {
          void showConfirmDialog("すべての学習データを削除します。この操作は元に戻せません。続けますか？")
            .then((confirmed) => {
              if (confirmed) {
                void useCase
                  .clearAllData()
                  .then(() => {
                    window.location.reload();
                  })
                  .catch((err: unknown) => {
                    console.error("データ初期化に失敗しました", err);
                    alert("データの初期化に失敗しました。ページを再読み込みしてもう一度お試しください。");
                  });
              }
            })
            .catch((err: unknown) => {
              console.error("確認ダイアログでエラーが発生しました", err);
            });
        });
        section.appendChild(resetDesc);
        section.appendChild(resetBtn);
        tabPanelArea.appendChild(section);
      }
    };

    tabDefs.forEach(({ id, label }) => {
      const btn = document.createElement("button");
      btn.className = "admin-manage-tab";
      btn.type = "button";
      btn.textContent = label;
      btn.dataset.tab = id;
      btn.addEventListener("click", () => showTabContent(id));
      tabBar.appendChild(btn);
    });

    contentArea.appendChild(tabBar);
    contentArea.appendChild(tabPanelArea);

    // 最初のタブ（インポート）を表示
    showTabContent("import");
  };

  // ── 📊データ参照セクション ────────────────────────────────────
  const showViewContent = (): void => {
    contentArea.classList.remove("admin-manage-open");
    contentArea.innerHTML = "";

    // 既存サブメニューを削除
    menuBar.querySelectorAll(".admin-view-submenu").forEach((el) => el.remove());

    /** セクションの完全な JSON テキストを返す（fullContent があればそちらを使う） */
    const getFullJson = (index: number): string => {
      const sec = sections[index]!;
      return JSON.stringify(sec.fullContent ?? sec.content, null, 2);
    };

    // ── モバイル用：閉じるボタン行（デスクトップではCSSで非表示） ──────
    const closeRow = document.createElement("div");
    closeRow.className = "admin-manage-close-row";
    const closeTitle = document.createElement("span");
    closeTitle.className = "admin-data-header-title";
    closeTitle.textContent = "📊 データ参照";
    closeRow.appendChild(closeTitle);
    const closeBtn = document.createElement("button");
    closeBtn.className = "admin-data-close-btn";
    closeBtn.type = "button";
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "閉じる");
    closeBtn.addEventListener("click", () => {
      contentArea.classList.remove("admin-data-open");
      contentArea.innerHTML = "";
      activeMenu = null;
      manageBtn.classList.remove("active");
      viewBtn.classList.remove("active");
    });
    closeRow.appendChild(closeBtn);
    contentArea.appendChild(closeRow);

    // ── タブバー ─────────────────────────────────────────────
    const tabBar = document.createElement("div");
    tabBar.className = "admin-data-tabs";

    // タブコンテンツエリア
    const tabContent = document.createElement("div");
    tabContent.className = "admin-data-tab-content";

    const showDataTab = (index: number): void => {
      tabBar.querySelectorAll(".admin-data-tab").forEach((t) => t.classList.remove("active"));
      const activeTab = tabBar.querySelectorAll<HTMLButtonElement>(".admin-data-tab")[index];
      if (activeTab) activeTab.classList.add("active");

      tabContent.innerHTML = "";
      contentArea.classList.add("admin-data-open");

      const section = sections[index];
      if (!section) return;

      const { content } = section;
      const jsonText = JSON.stringify(content, null, 2);
      const fullJsonText = getFullJson(index);

      // コピーボタンバー
      const btnBar = document.createElement("div");
      btnBar.className = "admin-data-btn-bar";

      const copyBtn = document.createElement("button");
      copyBtn.className = "admin-data-action-btn";
      copyBtn.type = "button";
      copyBtn.textContent = "📋 コピー";
      copyBtn.title = "クリップボードにコピー";
      copyBtn.addEventListener("click", () => {
        void navigator.clipboard.writeText(fullJsonText).then(() => {
          copyBtn.textContent = "✓ コピー済";
          setTimeout(() => {
            copyBtn.textContent = "📋 コピー";
          }, 1500);
        });
      });
      btnBar.appendChild(copyBtn);
      tabContent.appendChild(btnBar);

      const dataEl = document.createElement("pre");
      dataEl.className = "admin-data";
      dataEl.textContent = jsonText;
      tabContent.appendChild(dataEl);
    };

    sections.forEach(({ title }, index) => {
      const btn = document.createElement("button");
      btn.className = "admin-data-tab";
      btn.type = "button";
      btn.textContent = title;
      btn.addEventListener("click", () => {
        showDataTab(index);
      });
      tabBar.appendChild(btn);
    });

    contentArea.appendChild(tabBar);
    contentArea.appendChild(tabContent);

    // 最初のタブを選択
    showDataTab(0);
  };

  // メニューボタン
  const dataParentBtn = document.createElement("button");
  dataParentBtn.className = "admin-menu-btn admin-menu-parent";
  dataParentBtn.type = "button";
  dataParentBtn.textContent = "🛢️ データ";
  dataParentBtn.disabled = true;
  dataParentBtn.setAttribute("aria-disabled", "true");
  menuBar.appendChild(dataParentBtn);

  const manageBtn = document.createElement("button");
  manageBtn.className = "admin-menu-btn";
  manageBtn.type = "button";
  manageBtn.classList.add("admin-menu-child");
  manageBtn.textContent = "🛠️ 管理";
  manageBtn.addEventListener("click", () => {
    if (activeMenu === "manage") {
      // 再クリックでトグルオフ（コンテンツを閉じてメニューのみ表示に戻る）
      activeMenu = null;
      manageBtn.classList.remove("active");
      contentArea.innerHTML = "";
      contentArea.classList.remove("admin-manage-open", "admin-data-open");
      return;
    }
    activeMenu = "manage";
    manageBtn.classList.add("active");
    viewBtn.classList.remove("active");
    showManageContent();
  });
  menuBar.appendChild(manageBtn);

  const viewBtn = document.createElement("button");
  viewBtn.className = "admin-menu-btn";
  viewBtn.type = "button";
  viewBtn.classList.add("admin-menu-child");
  viewBtn.textContent = "📖 参照";
  viewBtn.addEventListener("click", () => {
    if (activeMenu === "view") {
      // 再クリックでトグルオフ（コンテンツを閉じてメニューのみ表示に戻る）
      activeMenu = null;
      viewBtn.classList.remove("active");
      contentArea.innerHTML = "";
      contentArea.classList.remove("admin-manage-open", "admin-data-open");
      return;
    }
    activeMenu = "view";
    viewBtn.classList.add("active");
    manageBtn.classList.remove("active");
    showViewContent();
  });
  menuBar.appendChild(viewBtn);

  // 管理メニューを左パネル (categoryList) に配置し、コンテンツを右パネル (adminContent) に配置する
  categoryList.appendChild(menuBar);
  const adminContentEl = document.getElementById("adminContent");
  if (adminContentEl) {
    adminContentEl.innerHTML = "";
    adminContentEl.appendChild(contentArea);
  }

  // 初期表示: メニューのみ（コンテンツ未選択）
}
