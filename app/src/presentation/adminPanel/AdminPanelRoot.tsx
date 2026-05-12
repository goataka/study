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

  const menuBtnBase =
    "w-full px-3 py-2 text-sm font-semibold border border-[#d1d5da] rounded-md cursor-pointer transition-[background,color] duration-150 font-[inherit] text-left";
  const menuBtnChild = `${menuBtnBase} bg-white text-[#586069] hover:bg-[#e8f0fe] hover:border-[#0366d6] hover:text-[#0366d6] [&.active]:bg-[#0366d6] [&.active]:border-[#0366d6] [&.active]:text-white`;
  const tabBtnBase =
    "px-3 py-1.5 text-sm font-semibold border border-[#d1d5da] border-b-0 rounded-t-md cursor-pointer transition-[background,color] duration-150 font-[inherit] bg-[#f6f8fa] text-[#586069] hover:bg-[#e8f0fe] hover:text-[#0366d6] [&.active]:bg-white [&.active]:text-[#24292e] [&.active]:border-[#d1d5da]";
  const actionBtnBase =
    "self-start px-3 py-1.5 text-sm font-semibold rounded-md cursor-pointer transition-[background,color] duration-150 font-[inherit]";

  return (
    <>
      <div className="admin-menu-bar flex flex-col items-stretch gap-2 p-1 bg-[#f6f8fa] border border-[#e1e4e8] rounded-md m-1">
        <span className="admin-menu-parent-label text-sm text-[#586069] font-semibold px-1 shrink-0">🛢️ データ</span>
        <button
          className={`admin-menu-btn admin-menu-child ${menuBtnChild}${activeMenu === "manage" ? " active" : ""}`}
          type="button"
          onClick={() => switchMenu("manage")}
        >
          🛠️ 管理
        </button>
        <button
          className={`admin-menu-btn admin-menu-child ${menuBtnChild}${activeMenu === "view" ? " active" : ""}`}
          type="button"
          onClick={() => switchMenu("view")}
        >
          📖 参照
        </button>
      </div>
      {createPortal(
        <div
          className={`admin-menu-content${activeMenu ? " flex flex-col gap-3 p-4 bg-white border border-[#e1e4e8] rounded-md shadow-lg max-h-[80vh] overflow-y-auto m-2" : " hidden"}`}
        >
          {activeMenu === "manage" ? (
            <>
              <div className="admin-manage-close-row flex items-center justify-between mb-1">
                <span className="admin-data-header-title text-base font-bold text-[#24292e]">🛢️ データ管理</span>
                <button
                  className="admin-data-close-btn inline-flex items-center justify-center w-7 h-7 rounded-full border border-[#d1d5da] bg-white text-[#586069] cursor-pointer text-sm font-semibold hover:bg-[#f0f7ff] hover:text-[#0366d6] hover:border-[#0366d6]"
                  type="button"
                  aria-label="閉じる"
                  onClick={closeContent}
                >
                  ✕
                </button>
              </div>
              <div className="admin-manage-tabs flex gap-1 border-b border-[#e1e4e8] pb-0">
                <button
                  className={`admin-manage-tab ${tabBtnBase}${manageTab === "import" ? " active" : ""}`}
                  type="button"
                  data-tab="import"
                  onClick={() => setManageTab("import")}
                >
                  📥 インポート
                </button>
                <button
                  className={`admin-manage-tab ${tabBtnBase}${manageTab === "export" ? " active" : ""}`}
                  type="button"
                  data-tab="export"
                  onClick={() => setManageTab("export")}
                >
                  📤 エクスポート
                </button>
                <button
                  className={`admin-manage-tab ${tabBtnBase}${manageTab === "reset" ? " active" : ""}`}
                  type="button"
                  data-tab="reset"
                  onClick={() => setManageTab("reset")}
                >
                  🗑️ 初期化
                </button>
              </div>
              <div className="admin-manage-tab-panel flex flex-col gap-3">
                {manageTab === "import" ? (
                  <div className="admin-reset-section flex flex-col gap-2">
                    <p className="admin-reset-desc text-sm text-[#586069]">
                      ダウンロードしたJSONファイルを選択して、学習データを更新します。
                    </p>
                    <label className="admin-import-label inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md border border-[#0366d6] text-[#0366d6] bg-white cursor-pointer hover:bg-[#e8f0fe]">
                      📂 JSONファイルを選択
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="admin-import-input"
                        style={{ display: "none" }}
                        onChange={onImportFileChange}
                      />
                    </label>
                    <span className="admin-import-filename text-xs text-[#586069]">{selectedFileName}</span>
                    {showPreview ? (
                      <pre className="admin-data text-xs bg-[#f6f8fa] border border-[#e1e4e8] rounded-md p-3 overflow-x-auto max-h-40 whitespace-pre-wrap break-all mt-2">
                        {previewText}
                      </pre>
                    ) : null}
                    {showApplyButton ? (
                      <button
                        className={`admin-import-apply-btn ${actionBtnBase} bg-[#0366d6] text-white border border-[#0255b8] hover:bg-[#0255b8]`}
                        type="button"
                        onClick={onApplyImport}
                      >
                        {applyButtonText}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {manageTab === "export" ? (
                  <div className="admin-reset-section flex flex-col gap-2">
                    <p className="admin-reset-desc text-sm text-[#586069]">
                      すべての学習データをJSONファイルとしてダウンロードします。定期的なバックアップにご利用ください。
                    </p>
                    <button
                      className={`admin-import-apply-btn ${actionBtnBase} bg-[#0366d6] text-white border border-[#0255b8] hover:bg-[#0255b8]`}
                      type="button"
                      onClick={onExportAllData}
                    >
                      ⬇️ データをエクスポートする
                    </button>
                  </div>
                ) : null}
                {manageTab === "reset" ? (
                  <div className="admin-reset-section flex flex-col gap-2">
                    <p className="admin-reset-desc text-sm text-[#586069]">
                      すべての学習データ（履歴・学習済み・進捗）を削除します。
                    </p>
                    <button
                      className={`admin-reset-btn ${actionBtnBase} bg-[#dc3545] text-white border border-[#c82333] hover:bg-[#c82333]`}
                      type="button"
                      onClick={onResetAllData}
                    >
                      🗑️ 全データを初期化する
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
          {activeMenu === "view" ? (
            <>
              <div className="admin-manage-close-row flex items-center justify-between mb-1">
                <span className="admin-data-header-title text-base font-bold text-[#24292e]">📊 データ参照</span>
                <button
                  className="admin-data-close-btn inline-flex items-center justify-center w-7 h-7 rounded-full border border-[#d1d5da] bg-white text-[#586069] cursor-pointer text-sm font-semibold hover:bg-[#f0f7ff] hover:text-[#0366d6] hover:border-[#0366d6]"
                  type="button"
                  aria-label="閉じる"
                  onClick={closeContent}
                >
                  ✕
                </button>
              </div>
              <div className="admin-data-tabs flex gap-1 border-b border-[#e1e4e8] pb-0">
                {sections.map(({ title }, index) => (
                  <button
                    key={`${title}-${index}`}
                    className={`admin-data-tab ${tabBtnBase}${viewTabIndex === index ? " active" : ""}`}
                    type="button"
                    onClick={() => setViewTabIndex(index)}
                  >
                    {title}
                  </button>
                ))}
              </div>
              <div className="admin-data-tab-content flex flex-col gap-2">
                <div className="admin-data-btn-bar flex gap-2">
                  <button
                    className={`admin-data-action-btn ${actionBtnBase} bg-[#f6f8fa] text-[#24292e] border border-[#d1d5da] hover:bg-[#e8f0fe] hover:text-[#0366d6]`}
                    type="button"
                    title="クリップボードにコピー"
                    onClick={copyCurrentData}
                  >
                    {copyButtonText}
                  </button>
                </div>
                <pre className="admin-data text-xs bg-[#f6f8fa] border border-[#e1e4e8] rounded-md p-3 overflow-x-auto max-h-[50vh] whitespace-pre-wrap break-all">
                  {viewJsonText}
                </pre>
              </div>
            </>
          ) : null}
        </div>,
        adminContentEl,
      )}
    </>
  );
}
