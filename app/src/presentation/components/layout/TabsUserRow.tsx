/**
 * 教科タブ + ユーザーエリア（名前 / アバター / アバター編集ダイアログ）。
 *
 * これら DOM 要素は既存の vanilla 実装（`QuizApp` / `AvatarController` 等）が
 * `getElementById` 経由で参照する。React は初期マークアップだけを担当し、
 * 後続の更新（テキスト・src 等）は引き続き既存コントローラが行う。
 *
 * ガイドリンクはタブ行の先頭に tabsBuilder が挿入するため
 * ここには含めない。
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AvatarCropDialog } from "../tabsUserRow/AvatarCropDialog";
import { UserProfileDialog } from "../tabsUserRow/UserProfileDialog";
import type { ScreenName } from "../screenStore";
import { subjectTabsContentStore } from "../subjectTabsContentStore";
import { headerUserSaveButton } from "../../styles/headerUserSaveButtonStyles";

interface TabsUserRowProps {
  currentScreen: ScreenName;
}

export function TabsUserRow({ currentScreen }: TabsUserRowProps): React.JSX.Element {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = (): void => {
      const maxLeft = el.scrollWidth - el.clientWidth;
      const left = Math.max(0, el.scrollLeft);
      setCanScrollLeft(left > 0);
      setCanScrollRight(maxLeft - left > 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resizeObserver?.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      resizeObserver?.disconnect();
    };
  }, [currentScreen]);

  const scrollTabs = (direction: "left" | "right"): void => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(120, Math.floor(el.clientWidth * 0.45));
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div
      id="tabsUserRow"
      className={[
        "tabs-user-row flex items-end gap-0 shrink-0 bg-transparent relative z-[2]",
        currentScreen === "start" || currentScreen === "quiz" ? "min-h-12" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* アプリ名（左固定） */}
      <button
        id="appNameLink"
        type="button"
        className={[
          "app-name-area shrink-0 flex items-center gap-1.5 px-4 self-center pt-px pb-0 border-none bg-transparent cursor-pointer text-left",
          currentScreen !== "start" && currentScreen !== "quiz" ? "hidden" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        title="スタート画面へ戻る"
        aria-label="スタート画面へ戻る"
      >
        <img src="./favicon.svg" className="header-logo w-9 h-9 shrink-0" alt="" aria-hidden="true" />
        <span className="app-name-text text-lg font-extrabold text-white whitespace-nowrap">
          Open Study Text 小中高
        </span>
      </button>
      {/* 教科タブ（中央寄せ・スタート画面専用） */}
      <div
        className={`relative flex-1 min-w-0 border-b border-solid border-[rgba(0,0,0,0.12)]${currentScreen !== "start" ? " hidden" : ""}`}
      >
        <div
          id="subjectTabs"
          ref={scrollerRef}
          className={[
            "subject-tabs",
            // overflow-x-auto は overflow-y も auto に計算されるため、アクティブタブの pb-[40px] 拡張が
            // クリップされてしまう。コンテナ側に pb-[40px] を付与して拡張分をパディング内に収め、
            // -mb-[40px] でレイアウト上の高さ増加を打ち消すことでクリッピングを回避する。
            "relative flex flex-1 min-w-0 gap-1 border-b-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 pt-0 pb-[40px] -mb-[40px] items-start justify-center",
          ].join(" ")}
          role="tablist"
          aria-label="教科を選択"
        >
          <SubjectTabsSection />
        </div>
        {canScrollLeft && (
          <button
            id="subjectTabsScrollLeft"
            type="button"
            className="absolute left-0 inset-y-0 z-10 inline-flex items-center justify-center min-w-6 rounded-none border border-[rgba(0,0,0,0.12)] border-b-0 bg-[#e8f0ff] text-[#5a4a28] text-xs shadow-[0_-2px_4px_rgba(0,0,0,0.08)] hover:brightness-[1.05]"
            aria-label="左にスクロール"
            onClick={() => scrollTabs("left")}
          >
            ◀
          </button>
        )}
        {canScrollRight && (
          <button
            id="subjectTabsScrollRight"
            type="button"
            className="absolute right-0 inset-y-0 z-10 inline-flex items-center justify-center min-w-6 rounded-none border border-[rgba(0,0,0,0.12)] border-b-0 bg-[#e8f0ff] text-[#5a4a28] text-xs shadow-[0_-2px_4px_rgba(0,0,0,0.08)] hover:brightness-[1.05]"
            aria-label="右にスクロール"
            onClick={() => scrollTabs("right")}
          >
            ▶
          </button>
        )}
      </div>
      <div
        id="tabsUserArea"
        className="tabs-user-area ml-auto self-center flex items-center gap-1.5 shrink-0 px-4 pt-px pb-0 relative pl-2"
      >
        <button
          id="headerUserName"
          className="header-user-name text-sm text-white font-semibold max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap bg-transparent border-none rounded-md px-2 py-1 cursor-pointer transition-[background,color] duration-150 hover:bg-white/15 hover:text-white focus-visible:bg-white/15 focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          type="button"
          title="プロフィールを開く"
          aria-label="プロフィールを開く"
        ></button>
        <div id="headerUserEdit" className="header-user-edit hidden flex items-center gap-1">
          <input
            type="text"
            id="headerUserNameInput"
            className="header-user-name-input px-2 py-1 border border-[#0366d6] rounded-md text-base w-[140px] shadow-[0_0_0_3px_rgba(3,102,214,0.1)] outline-none"
            maxLength={20}
            placeholder="名前を入力"
          />
          <button type="button" id="headerUserNameSaveBtn" className={headerUserSaveButton()} aria-label="保存">
            ✓
          </button>
        </div>
        <button
          id="headerAddUserBtn"
          className="header-add-user-btn text-sm text-white/80 bg-transparent border border-white/40 rounded-md px-1.5 py-0.5 cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-white/15 hover:text-white hover:border-white/70 focus-visible:bg-white/15 focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          type="button"
          title="ユーザーを追加する"
          aria-label="ユーザーを追加する"
        >
          ＋
        </button>
        <div id="headerAddUserEdit" className="header-add-user-edit hidden flex items-center gap-1">
          <input
            type="text"
            id="headerAddUserInput"
            className="header-add-user-input px-2 py-1 border border-[#28a745] rounded-md text-base w-[140px] shadow-[0_0_0_3px_rgba(40,167,69,0.1)] outline-none"
            maxLength={20}
            placeholder="新しいユーザー名"
          />
          <button type="button" id="headerAddUserSaveBtn" className={headerUserSaveButton()} aria-label="追加">
            ＋
          </button>
        </div>
        <button
          id="headerUserAvatar"
          className="header-user-avatar relative w-9 h-9 rounded-full border-2 border-[#d0d8e0] overflow-hidden cursor-pointer shrink-0 flex items-center justify-center bg-[#f0f4f8] transition-[border-color,box-shadow] duration-150 select-none p-0 hover:border-[#0366d6] hover:shadow-[0_0_0_2px_rgba(3,102,214,0.3)] focus-visible:border-[#0366d6] focus-visible:shadow-[0_0_0_2px_rgba(3,102,214,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          type="button"
          title="プロフィールを開く"
          aria-label="プロフィールを開く"
        >
          {/* src は AvatarController が動的に設定する。空文字属性は React の警告対象なので未設定にする。 */}
          <img
            id="headerUserAvatarImg"
            className="header-user-avatar-img hidden h-full w-full rounded-full object-cover [&.visible]:block"
            alt=""
            aria-hidden="true"
          />
          {/* display は JS が .hidden クラスで制御するため 11-header-controls.css の .hidden ルールを参照 */}
          <span
            id="headerUserAvatarPlaceholder"
            className="header-user-avatar-placeholder text-base leading-none text-[#0366d6]"
            aria-hidden="true"
          >
            👤
          </span>
        </button>
        <AvatarCropDialog />
        <UserProfileDialog />
      </div>
    </div>
  );
}

/** 教科タブ列 — subjectTabsContentStore から描画。 */
function SubjectTabsSection(): React.JSX.Element {
  const node = useSyncExternalStore(
    subjectTabsContentStore.subscribe,
    subjectTabsContentStore.get,
    subjectTabsContentStore.get,
  );
  return <>{node}</>;
}
