import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { fallbackCopy } from "../uiHelpers";
import {
  detectFileKeyFromFilename,
  formatPreviewText,
  truncateArray,
  validateImportPayload,
  type AdminSectionKey,
} from "../adminPanelLogic";
import type { AdminPanelDeps } from "./types";

type ManageTab = "import" | "export" | "reset";
type ActiveMenu = "manage" | "view" | null;
type SectionKey = "settings" | AdminSectionKey;

interface AdminPanelRootProps extends AdminPanelDeps {
  adminContentEl: HTMLElement;
  onExportAllData: () => void;
}

export function AdminPanelRoot({
  useCase,
  progressRepo,
  shareUrl,
  showConfirmDialog,
  adminContentEl,
  onExportAllData,
}: AdminPanelRootProps): React.JSX.Element {
  const data = useCase.exportAllData();
  const sections = useMemo(
    () =>
      [
        {
          title: "設定",
          fileKey: "settings" as const,
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
          fileKey: "history" as const,
          content: truncateArray(data.history),
          fullContent: data.history,
        },
        {
          title: "学習済み問題",
          fileKey: "mastered" as const,
          content: truncateArray(data.masteredIds),
          fullContent: data.masteredIds,
        },
        { title: "連続正解", fileKey: "streaks" as const, content: data.correctStreaks },
      ] satisfies Array<{ title: string; fileKey: SectionKey; content: unknown; fullContent?: unknown }>,
    [data, progressRepo, shareUrl],
  );

  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const [manageTab, setManageTab] = useState<ManageTab>("import");
  const [viewTabIndex, setViewTabIndex] = useState(0);

  const [selectedFileName, setSelectedFileName] = useState("（未選択）");
  const [previewText, setPreviewText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showApplyButton, setShowApplyButton] = useState(false);
  const [applyButtonText, setApplyButtonText] = useState("✅ データを更新する");
  const [parsedData, setParsedData] = useState<unknown>(null);
  const [detectedFileKey, setDetectedFileKey] = useState<AdminSectionKey | null>(null);
  const [copyButtonText, setCopyButtonText] = useState("📋 コピー");

  const closeContent = (): void => {
    setActiveMenu(null);
  };

  const switchMenu = (menu: Exclude<ActiveMenu, null>): void => {
    if (activeMenu === menu) {
      setActiveMenu(null);
      return;
    }
    setActiveMenu(menu);
  };

  const onImportFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (): void => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setParsedData(parsed);
        const detected = detectFileKeyFromFilename(file.name);
        const fileKey = detected !== null && detected !== "settings" ? detected : null;
        setDetectedFileKey(fileKey);

        const formattedPreview = formatPreviewText(parsed);
        if (fileKey) {
          setPreviewText(formattedPreview);
          setApplyButtonText(`✅ ${sections.find((s) => s.fileKey === fileKey)?.title ?? fileKey} を更新する`);
          setShowApplyButton(true);
        } else if (detected === "settings") {
          setPreviewText(`設定ファイルのインポートは未対応です。\n\n${formattedPreview}`);
          setShowApplyButton(false);
        } else {
          setPreviewText(
            "対応するデータ種類が判定できませんでした。ファイル名に history / mastered / streaks を含めてください。\n\n" +
              formattedPreview,
          );
          setShowApplyButton(false);
        }
      } catch {
        setParsedData(null);
        setDetectedFileKey(null);
        setPreviewText("JSONの解析に失敗しました。ファイルを確認してください。");
        setShowApplyButton(false);
      } finally {
        setShowPreview(true);
      }
    };
    reader.readAsText(file);
  };

  const onApplyImport = (): void => {
    if (!parsedData || !detectedFileKey) {
      alert("対応するデータ種類が判定できませんでした。ファイル名に history / mastered / streaks を含めてください。");
      return;
    }
    const sectionTitle = sections.find((s) => s.fileKey === detectedFileKey)?.title ?? detectedFileKey;
    const validationError = validateImportPayload(detectedFileKey, parsedData, sectionTitle);
    if (validationError) {
      alert(validationError);
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
  };

  const onResetAllData = (): void => {
    void showConfirmDialog("すべての学習データを削除します。この操作は元に戻せません。続けますか？")
      .then((confirmed) => {
        if (!confirmed) return;
        void useCase
          .clearAllData()
          .then(() => {
            window.location.reload();
          })
          .catch((err: unknown) => {
            console.error("データ初期化に失敗しました", err);
            alert("データの初期化に失敗しました。ページを再読み込みしてもう一度お試しください。");
          });
      })
      .catch((err: unknown) => {
        console.error("確認ダイアログでエラーが発生しました", err);
      });
  };

  const copyCurrentData = (): void => {
    const section = sections[viewTabIndex];
    if (!section) return;
    const fullJsonText = JSON.stringify(section.fullContent ?? section.content, null, 2);
    const markCopied = (): void => {
      setCopyButtonText("✓ コピー済");
      setTimeout(() => {
        setCopyButtonText("📋 コピー");
      }, 1500);
    };

    if (navigator.clipboard) {
      void navigator.clipboard
        .writeText(fullJsonText)
        .then(markCopied)
        .catch(() => {
          fallbackCopy(fullJsonText);
          markCopied();
        });
      return;
    }
    fallbackCopy(fullJsonText);
    markCopied();
  };

  const selectedViewSection = sections[viewTabIndex];
  const viewJsonText = selectedViewSection ? JSON.stringify(selectedViewSection.content, null, 2) : "";

  return (
    <>
      <div className="admin-menu-bar">
        <button className="admin-menu-btn admin-menu-parent" type="button" disabled aria-disabled="true">
          🛢️ データ
        </button>
        <button
          className={`admin-menu-btn admin-menu-child${activeMenu === "manage" ? " active" : ""}`}
          type="button"
          onClick={() => switchMenu("manage")}
        >
          🛠️ 管理
        </button>
        <button
          className={`admin-menu-btn admin-menu-child${activeMenu === "view" ? " active" : ""}`}
          type="button"
          onClick={() => switchMenu("view")}
        >
          📖 参照
        </button>
      </div>
      {createPortal(
        <div
          className={`admin-menu-content${activeMenu === "manage" ? " admin-manage-open" : ""}${activeMenu === "view" ? " admin-data-open" : ""}`}
        >
          {activeMenu === "manage" ? (
            <>
              <div className="admin-manage-close-row">
                <span className="admin-data-header-title">🛢️ データ管理</span>
                <button className="admin-data-close-btn" type="button" aria-label="閉じる" onClick={closeContent}>
                  ✕
                </button>
              </div>
              <div className="admin-manage-tabs">
                <button
                  className={`admin-manage-tab${manageTab === "import" ? " active" : ""}`}
                  type="button"
                  data-tab="import"
                  onClick={() => setManageTab("import")}
                >
                  📥 インポート
                </button>
                <button
                  className={`admin-manage-tab${manageTab === "export" ? " active" : ""}`}
                  type="button"
                  data-tab="export"
                  onClick={() => setManageTab("export")}
                >
                  📤 エクスポート
                </button>
                <button
                  className={`admin-manage-tab${manageTab === "reset" ? " active" : ""}`}
                  type="button"
                  data-tab="reset"
                  onClick={() => setManageTab("reset")}
                >
                  🗑️ 初期化
                </button>
              </div>
              <div className="admin-manage-tab-panel">
                {manageTab === "import" ? (
                  <div className="admin-reset-section">
                    <p className="admin-reset-desc">
                      ダウンロードしたJSONファイルを選択して、学習データを更新します。
                    </p>
                    <label className="admin-import-label">
                      📂 JSONファイルを選択
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="admin-import-input"
                        style={{ display: "none" }}
                        onChange={onImportFileChange}
                      />
                    </label>
                    <span className="admin-import-filename">{selectedFileName}</span>
                    {showPreview ? (
                      <pre className="admin-data" style={{ marginTop: "8px" }}>
                        {previewText}
                      </pre>
                    ) : null}
                    {showApplyButton ? (
                      <button className="admin-import-apply-btn" type="button" onClick={onApplyImport}>
                        {applyButtonText}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {manageTab === "export" ? (
                  <div className="admin-reset-section">
                    <p className="admin-reset-desc">
                      すべての学習データをJSONファイルとしてダウンロードします。定期的なバックアップにご利用ください。
                    </p>
                    <button
                      className="admin-import-apply-btn"
                      type="button"
                      style={{ marginTop: "8px" }}
                      onClick={onExportAllData}
                    >
                      ⬇️ データをエクスポートする
                    </button>
                  </div>
                ) : null}
                {manageTab === "reset" ? (
                  <div className="admin-reset-section">
                    <p className="admin-reset-desc">すべての学習データ（履歴・学習済み・進捗）を削除します。</p>
                    <button className="admin-reset-btn" type="button" onClick={onResetAllData}>
                      🗑️ 全データを初期化する
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
          {activeMenu === "view" ? (
            <>
              <div className="admin-manage-close-row">
                <span className="admin-data-header-title">📊 データ参照</span>
                <button className="admin-data-close-btn" type="button" aria-label="閉じる" onClick={closeContent}>
                  ✕
                </button>
              </div>
              <div className="admin-data-tabs">
                {sections.map(({ title }, index) => (
                  <button
                    key={`${title}-${index}`}
                    className={`admin-data-tab${viewTabIndex === index ? " active" : ""}`}
                    type="button"
                    onClick={() => setViewTabIndex(index)}
                  >
                    {title}
                  </button>
                ))}
              </div>
              <div className="admin-data-tab-content">
                <div className="admin-data-btn-bar">
                  <button className="admin-data-action-btn" type="button" title="クリップボードにコピー" onClick={copyCurrentData}>
                    {copyButtonText}
                  </button>
                </div>
                <pre className="admin-data">{viewJsonText}</pre>
              </div>
            </>
          ) : null}
        </div>,
        adminContentEl,
      )}
    </>
  );
}

