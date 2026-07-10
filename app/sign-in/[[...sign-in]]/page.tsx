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
            background: rgba(2, 6, 23, 0.94) !important;
            border: 1px solid rgba(74, 222, 128, 0.28) !important;
            box-shadow: none !important;
            color: #f8fafc !important;
          }

          .cl-card * {
            color-scheme: dark !important;
          }

          .cl-headerTitle {
            color: #f8fafc !important;
            font-weight: 800 !important;
          }

          .cl-headerSubtitle {
            color: rgba(220, 252, 231, 0.8) !important;
          }

          .cl-socialButtonsBlockButton {
            background: rgba(15, 23, 42, 0.96) !important;
            border: 1px solid rgba(74, 222, 128, 0.45) !important;
            color: #f8fafc !important;
          }

          .cl-socialButtonsBlockButton:hover {
            background: rgba(20, 83, 45, 0.65) !important;
          }

          .cl-socialButtonsBlockButtonText {
            color: #f8fafc !important;
            font-weight: 800 !important;
          }

          .cl-formFieldLabel {
            color: rgba(220, 252, 231, 0.95) !important;
            font-weight: 700 !important;
          }

          .cl-formFieldLabelRow {
            color: rgba(220, 252, 231, 0.95) !important;
          }

          .cl-formFieldLabelRow span,
          .cl-formFieldLabelRow div,
          .cl-formFieldLabelRow [class*="badge"],
          .cl-formFieldLabelRow [class*="Badge"],
          .cl-formFieldLabelRow [class*="last"],
          .cl-formFieldLabelRow [class*="Last"] {
            color: #dcfce7 !important;
          }

          .cl-badge,
          [class*="badge"],
          [class*="Badge"] {
            background: rgba(15, 23, 42, 0.98) !important;
            border: 1px solid rgba(74, 222, 128, 0.35) !important;
            color: #dcfce7 !important;
            box-shadow: none !important;
          }

          .cl-badge *,
          [class*="badge"] *,
          [class*="Badge"] * {
            color: #dcfce7 !important;
          }

          .cl-formFieldInput {
            background: rgba(255, 255, 255, 0.98) !important;
            color: #0f172a !important;
            border: 1px solid rgba(74, 222, 128, 0.45) !important;
            box-shadow: none !important;
          }

          .cl-formFieldInput::placeholder {
            color: #64748b !important;
          }

          .cl-formButtonPrimary {
            background: #22c55e !important;
            color: #052e16 !important;
            font-weight: 900 !important;
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.35) !important;
          }

          .cl-formButtonPrimary:hover {
            background: #4ade80 !important;
          }

          .cl-dividerText {
            color: rgba(220, 252, 231, 0.72) !important;
          }

          .cl-dividerLine {
            background: rgba(74, 222, 128, 0.24) !important;
          }

          .cl-footer {
            background: transparent !important;
          }

          .cl-footerActionText {
            color: rgba(220, 252, 231, 0.72) !important;
          }

          .cl-footerActionLink {
            color: #86efac !important;
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
            color: #86efac !important;
          }

          .cl-internal-1dauvpw {
            display: none !important;
          }
        `}
      </style>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center">
            <div className="text-sm font-semibold tracking-[0.35em] text-green-300">
              VVILDKOREA
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
              ERP Admin
            </h1>

            <p className="mt-3 text-sm font-medium text-green-100/80">
              운영자 전용 시스템입니다. Google 계정으로 로그인해 주세요.
            </p>
          </div>

          <div className="rounded-[28px] border border-green-400/25 bg-black/45 p-4 shadow-[0_0_80px_rgba(34,197,94,0.3)] backdrop-blur-xl">
            <SignIn
              appearance={{
                variables: {
                  colorPrimary: "#22c55e",
                  colorBackground: "rgba(2, 6, 23, 0.94)",
                  colorForeground: "#f8fafc",
                  colorMutedForeground: "#bbf7d0",
                  colorInput: "#ffffff",
                  colorInputForeground: "#0f172a",
                  colorDanger: "#fb7185",
                  borderRadius: "1rem",
                },
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none",
                  card: "w-full bg-slate-950/95 shadow-none border border-green-400/20",
                  headerTitle: "text-white",
                  headerSubtitle: "text-green-100/80",
                  socialButtonsBlockButton:
                    "border border-green-400/30 bg-slate-950 text-white hover:bg-green-950/70",
                  socialButtonsBlockButtonText: "text-white font-bold",
                  formFieldLabel: "text-green-100 font-bold",
                  formFieldLabelRow: "text-green-100",
                  formFieldInput:
                    "bg-white text-slate-950 placeholder:text-slate-500",
                  formButtonPrimary:
                    "bg-green-500 text-green-950 hover:bg-green-400 font-black",
                  footerActionText: "text-green-100/80",
                  footerActionLink:
                    "text-green-300 hover:text-green-200 font-bold",
                  dividerLine: "bg-green-400/20",
                  dividerText: "text-green-100/70",
                  badge:
                    "bg-slate-950 text-green-100 border border-green-400/30",
                },
              }}
            />
          </div>

          <p className="mt-6 text-center text-xs font-medium text-green-100/55">
            Authorized operators only · vvildkorea ERP
          </p>
        </div>
      </div>
    </main>
  );
}