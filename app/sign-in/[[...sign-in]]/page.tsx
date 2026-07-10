import { SignIn } from "@clerk/nextjs";
import MatrixBackground from "./matrix-background";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <MatrixBackground />

      <style>
        {`
          .cl-rootBox {
            width: 100% !important;
          }

          .cl-cardBox {
            width: 100% !important;
            box-shadow: none !important;
          }

          .cl-card {
            width: 100% !important;
            background: rgba(10, 10, 10, 0.88) !important;
            border: 1px solid rgba(239, 68, 68, 0.3) !important;
            box-shadow: 0 0 40px rgba(0, 0, 0, 0.35) !important;
            color: #ffffff !important;
            backdrop-filter: blur(12px) !important;
          }

          .cl-card * {
            color-scheme: dark !important;
          }

          .cl-headerTitle {
            color: #ffffff !important;
            font-weight: 800 !important;
          }

          .cl-headerSubtitle {
            color: rgba(255, 255, 255, 0.72) !important;
          }

          .cl-socialButtonsBlockButton {
            background: rgba(20, 20, 20, 0.92) !important;
            border: 1px solid rgba(239, 68, 68, 0.35) !important;
            color: #ffffff !important;
          }

          .cl-socialButtonsBlockButton:hover {
            background: rgba(127, 29, 29, 0.55) !important;
          }

          .cl-socialButtonsBlockButtonText {
            color: #ffffff !important;
            font-weight: 800 !important;
          }

          .cl-formFieldLabel {
            color: rgba(255, 255, 255, 0.95) !important;
            font-weight: 700 !important;
          }

          .cl-formFieldLabelRow {
            color: rgba(255, 255, 255, 0.95) !important;
          }

          .cl-formFieldLabelRow span,
          .cl-formFieldLabelRow div,
          .cl-formFieldLabelRow [class*="badge"],
          .cl-formFieldLabelRow [class*="Badge"],
          .cl-formFieldLabelRow [class*="last"],
          .cl-formFieldLabelRow [class*="Last"] {
            color: #ffe4e6 !important;
          }

          .cl-badge,
          [class*="badge"],
          [class*="Badge"] {
            background: rgba(20, 20, 20, 0.98) !important;
            border: 1px solid rgba(239, 68, 68, 0.32) !important;
            color: #ffe4e6 !important;
            box-shadow: none !important;
          }

          .cl-badge *,
          [class*="badge"] *,
          [class*="Badge"] * {
            color: #ffe4e6 !important;
          }

          .cl-formFieldInput {
            background: rgba(255, 255, 255, 0.98) !important;
            color: #111827 !important;
            border: 1px solid rgba(239, 68, 68, 0.38) !important;
            box-shadow: none !important;
          }

          .cl-formFieldInput::placeholder {
            color: #6b7280 !important;
          }

          .cl-formButtonPrimary {
            background: #dc2626 !important;
            color: #ffffff !important;
            font-weight: 900 !important;
            box-shadow: 0 0 24px rgba(220, 38, 38, 0.35) !important;
          }

          .cl-formButtonPrimary:hover {
            background: #ef4444 !important;
          }

          .cl-dividerText {
            color: rgba(255, 255, 255, 0.65) !important;
          }

          .cl-dividerLine {
            background: rgba(255, 255, 255, 0.16) !important;
          }

          .cl-footer {
            background: transparent !important;
          }

          .cl-footerActionText {
            color: rgba(255, 255, 255, 0.7) !important;
          }

          .cl-footerActionLink {
            color: #fca5a5 !important;
            font-weight: 800 !important;
          }

          .cl-identityPreviewText,
          .cl-userPreviewTextContainer,
          .cl-formFieldAction,
          .cl-formFieldHintText,
          .cl-formResendCodeLink,
          .cl-alternativeMethodsBlockButton,
          .cl-breadcrumbsItem,
          .cl-breadcrumbsItemDivider {
            color: #fecaca !important;
          }
        `}
      </style>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center">
            <div className="text-sm font-semibold tracking-[0.35em] text-red-200">
              VVILDKOREA
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
              ERP Admin
            </h1>

            <p className="mt-3 text-sm font-medium text-white/80">
              운영자 전용 시스템입니다. Google 계정으로 로그인해 주세요.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/15 bg-black/45 p-4 shadow-[0_0_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <SignIn
              appearance={{
                options: {
                  unsafe_disableDevelopmentModeWarnings: true,
                },
                variables: {
                  colorPrimary: "#dc2626",
                  colorBackground: "rgba(10, 10, 10, 0.88)",
                  colorForeground: "#ffffff",
                  colorMutedForeground: "#f5d0d0",
                  colorInput: "#ffffff",
                  colorInputForeground: "#111827",
                  colorDanger: "#fb7185",
                  borderRadius: "1rem",
                },
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none",
                  card: "w-full bg-black/80 shadow-none border border-red-400/25",
                  headerTitle: "text-white",
                  headerSubtitle: "text-white/70",
                  socialButtonsBlockButton:
                    "border border-red-400/30 bg-black text-white hover:bg-red-950/60",
                  socialButtonsBlockButtonText: "text-white font-bold",
                  formFieldLabel: "text-white font-bold",
                  formFieldLabelRow: "text-white",
                  formFieldInput:
                    "bg-white text-slate-900 placeholder:text-slate-500",
                  formButtonPrimary:
                    "bg-red-600 text-white hover:bg-red-500 font-black",
                  footerActionText: "text-white/70",
                  footerActionLink: "text-red-200 hover:text-red-100 font-bold",
                  dividerLine: "bg-white/15",
                  dividerText: "text-white/65",
                  badge: "bg-black text-red-100 border border-red-400/30",
                },
              }}
            />
          </div>

          <p className="mt-6 text-center text-xs font-medium text-white/60">
            Authorized operators only · vvildkorea ERP
          </p>
        </div>
      </div>
    </main>
  );
}