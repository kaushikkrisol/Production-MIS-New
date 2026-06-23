import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppRoutes from "./app.routes";

const Signin = lazy(() => import("../feature-module/pages/login/signin"));
const SigninTwo = lazy(() => import("../feature-module/pages/login/signinTwo"));
const SigninThree = lazy(() => import("../feature-module/pages/login/signinThree"));
const Register = lazy(() => import("../feature-module/pages/register/register"));
const RegisterTwo = lazy(() => import("../feature-module/pages/register/registerTwo"));
const RegisterThree = lazy(() => import("../feature-module/pages/register/registerThree"));
const Forgotpassword = lazy(() => import("../feature-module/pages/forgotpassword/forgotpassword"));
const ForgotpasswordTwo = lazy(() => import("../feature-module/pages/forgotpassword/forgotpasswordTwo"));
const ForgotpasswordThree = lazy(() => import("../feature-module/pages/forgotpassword/forgotpasswordThree"));
const Resetpassword = lazy(() => import("../feature-module/pages/resetpassword/resetpassword"));
const ResetpasswordTwo = lazy(() => import("../feature-module/pages/resetpassword/resetpasswordTwo"));
const ResetpasswordThree = lazy(() => import("../feature-module/pages/resetpassword/resetpasswordThree"));
const EmailVerification = lazy(() => import("../feature-module/pages/emailverification/emailverification"));
const EmailverificationTwo = lazy(() => import("../feature-module/pages/emailverification/emailverificationTwo"));
const EmailverificationThree = lazy(() => import("../feature-module/pages/emailverification/emailverificationThree"));
const Twostepverification = lazy(() => import("../feature-module/pages/twostepverification/twostepverification"));
const TwostepverificationTwo = lazy(() => import("../feature-module/pages/twostepverification/twostepverificationTwo"));
const TwostepverificationThree = lazy(() => import("../feature-module/pages/twostepverification/twostepverificationThree"));
const Lockscreen = lazy(() => import("../feature-module/pages/lockscreen"));
const Error404 = lazy(() => import("../feature-module/pages/errorpages/error404"));
const Error500 = lazy(() => import("../feature-module/pages/errorpages/error500"));
const Blankpage = lazy(() => import("../feature-module/pages/blankpage"));
const Comingsoon = lazy(() => import("../feature-module/pages/comingsoon"));
const Undermaintainence = lazy(() => import("../feature-module/pages/undermaintainence"));

const authPaths = new Set([
  "/signin",
  "/signin-2",
  "/signin-3",
  "/register",
  "/register-2",
  "/register-3",
  "/forgot-password",
  "/forgot-password-2",
  "/forgot-password-3",
  "/reset-password",
  "/reset-password-2",
  "/reset-password-3",
  "/email-verification",
  "/email-verification-2",
  "/email-verification-3",
  "/two-step-verification",
  "/two-step-verification-2",
  "/two-step-verification-3",
  "/lock-screen",
  "/error-404",
  "/error-500",
  "/blank-page",
  "/coming-soon",
  "/under-maintenance",
]);

const AuthRoutes = () => (
  <Routes>
    <Route path="/signin" element={<Signin />} />
    <Route path="/signin-2" element={<SigninTwo />} />
    <Route path="/signin-3" element={<SigninThree />} />
    <Route path="/register" element={<Register />} />
    <Route path="/register-2" element={<RegisterTwo />} />
    <Route path="/register-3" element={<RegisterThree />} />
    <Route path="/forgot-password" element={<Forgotpassword />} />
    <Route path="/forgot-password-2" element={<ForgotpasswordTwo />} />
    <Route path="/forgot-password-3" element={<ForgotpasswordThree />} />
    <Route path="/reset-password" element={<Resetpassword />} />
    <Route path="/reset-password-2" element={<ResetpasswordTwo />} />
    <Route path="/reset-password-3" element={<ResetpasswordThree />} />
    <Route path="/email-verification" element={<EmailVerification />} />
    <Route path="/email-verification-2" element={<EmailverificationTwo />} />
    <Route path="/email-verification-3" element={<EmailverificationThree />} />
    <Route path="/two-step-verification" element={<Twostepverification />} />
    <Route path="/two-step-verification-2" element={<TwostepverificationTwo />} />
    <Route path="/two-step-verification-3" element={<TwostepverificationThree />} />
    <Route path="/lock-screen" element={<Lockscreen />} />
    <Route path="/error-404" element={<Error404 />} />
    <Route path="/error-500" element={<Error500 />} />
    <Route path="/blank-page" element={<Blankpage />} />
    <Route path="/coming-soon" element={<Comingsoon />} />
    <Route path="/under-maintenance" element={<Undermaintainence />} />
    <Route path="*" element={<Navigate to="/signin" replace />} />
  </Routes>
);

const AllRoutes = () => {
  const { pathname } = useLocation();
  const isAuthPage = authPaths.has(pathname);

  if (pathname === "/") {
    return <Navigate to="/signin" replace />;
  }

  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      {isAuthPage ? <AuthRoutes /> : <AppRoutes />}
    </Suspense>
  );
};

export default AllRoutes;
