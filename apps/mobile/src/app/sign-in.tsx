import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { SecondStep } from "@/components/second-step";
import { SocialButtons } from "@/components/social-buttons";
import { AuthBackdrop, AuthBrand, OrDivider, QuietAction, TextAction } from "@/components/auth-ui";
import { Button, Field, Notice, Screen } from "@/components/ui";
import { ApiError, messageOf } from "@/lib/api";
import { signInMethods, useAuth, type Challenge } from "@/lib/auth";
import { takeComeBack } from "@/lib/guest";
import { site } from "@/lib/site";
import { spacing } from "@/lib/theme";

/**
 * Sign in: a password, or a code sent by email when the API has that switched on, and
 * then the second step for an account that has one.
 *
 * Where the API has Google (or GitHub) switched on, there is a button for it. Where it lets
 * people create their own account, there is a way to from here.
 *
 * Signing in with a passkey or an emailed link is the dashboard's for now: each ends at a
 * web address, which a phone app has to be taught to open.
 */
export default function SignIn() {
  const auth = useAuth();
  // Sent here from sign-up with an address that already has an account: it is filled in.
  const params = useLocalSearchParams<{ email?: string; reason?: string }>();
  const [way, setWay] = useState<"password" | "code" | "verify">("password");
  const [emailCode, setEmailCode] = useState(false);
  const [registration, setRegistration] = useState(false);
  const [social, setSocial] = useState<string[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    signInMethods().then((methods) => {
      setEmailCode(methods.emailCode);
      setRegistration(methods.registration);
      setSocial(methods.social);
    });
  }, []);

  /** Run one step, showing what went wrong if it did. */
  const run = async (step: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await step();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const withProvider = async (name: string) => {
    setProvider(name);
    setError(null);
    try {
      setChallenge(await auth.signInWithProvider(name));
    } catch (caught) {
      setError(caught);
    } finally {
      setProvider(null);
    }
  };

  if (challenge) {
    return <SecondStep challenge={challenge} onCancel={() => setChallenge(null)} />;
  }

  /**
   * A password sign-in for an account whose email isn't proven yet: Laravel has just emailed
   * a new code, so the code is asked for here, and entering it signs them in.
   */
  const withPassword = () =>
    run(async () => {
      try {
        setChallenge(await auth.signIn(address, password));
      } catch (caught) {
        if (caught instanceof ApiError && caught.code === "EMAIL_NOT_VERIFIED") {
          setWay("verify");
          setCode("");
          return;
        }
        throw caught;
      }
    });

  const issue = (path: string) => (error instanceof ApiError ? error.issue(path) : undefined);
  const address = email.trim();

  const subtitle =
    way === "verify"
      ? `Verify your email first: enter the 6-digit code we just sent to ${address}.`
      : way === "password"
        ? params.reason === "cart"
          ? "Sign in to add it to your cart. You'll come back to it."
          : params.reason === "like"
            ? "Sign in to keep the drinks you like. You'll come back to it."
            : "Sign in to continue"
        : codeSent
          ? `Enter the code we sent to ${address}.`
          : "We'll email you a code to sign in with.";
  const verify = () => run(async () => setChallenge(await auth.verifyEmail(address, code)));
  const others = social.length > 0 || (emailCode && way !== "verify") || registration;

  return (
    <Screen edges={["top", "bottom"]} centered backdrop={<AuthBackdrop />}>
      <AuthBrand subtitle={subtitle} />

      {error && !(error instanceof ApiError && error.issues.length > 0) ? <Notice>{messageOf(error)}</Notice> : null}

      <Field inline icon="mail-outline" label="Email" value={email} onChangeText={setEmail} error={issue("email")} autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" textContentType="username" editable={!codeSent && way !== "verify"} returnKeyType="next" />

      {way === "verify" ? (
        <>
          <Field inline icon="keypad-outline" label="6-digit code" value={code} onChangeText={setCode} error={issue("code")} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" autoFocus returnKeyType="go" onSubmitEditing={verify} />
          <Button hero label="Verify and sign in" busy={busy} disabled={code.trim() === ""} onPress={verify} />
          <TextAction lead="No code?" action="Send a new one" disabled={busy} onPress={() => run(async () => { await auth.resendVerification(address); setCode(""); })} />
          <QuietAction label="Back" disabled={busy} onPress={() => { setWay("password"); setCode(""); setError(null); }} />
        </>
      ) : way === "password" ? (
        <>
          <Field inline icon="lock-closed-outline" label="Password" value={password} onChangeText={setPassword} error={issue("password")} secureTextEntry autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={withPassword} />
          <Button hero label="Sign in" busy={busy} disabled={address === "" || password === "" || provider !== null} onPress={withPassword} />
        </>
      ) : codeSent ? (
        <>
          <Field inline icon="keypad-outline" label="6-digit code" value={code} onChangeText={setCode} error={issue("code")} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" autoFocus />
          <Button hero label="Sign in" busy={busy} disabled={code.trim() === "" || provider !== null} onPress={() => run(async () => setChallenge(await auth.signInWithCode(address, code)))} />
          <TextAction lead="Wrong address?" action="Use a different email" onPress={() => { setCodeSent(false); setCode(""); setError(null); }} />
        </>
      ) : (
        <Button hero label="Email me a code" busy={busy} disabled={address === "" || provider !== null} onPress={() => run(async () => { await auth.sendEmailCode(address); setCodeSent(true); })} />
      )}

      {way !== "verify" && others ? <OrDivider /> : null}
      {way !== "verify" ? <SocialButtons divider={false} providers={social} busy={provider} disabled={busy} onPick={withProvider} /> : null}

      {emailCode && way !== "verify" ? (
        <TextAction
          lead={way === "password" ? "Sign in with an" : "Sign in with a"}
          action={way === "password" ? "emailed code instead" : "password instead"}
          onPress={() => { setWay(way === "password" ? "code" : "password"); setCodeSent(false); setCode(""); setError(null); }}
        />
      ) : null}

      {registration && way !== "verify" ? <TextAction lead="New here?" action="Create an account" disabled={busy} onPress={() => router.push("/sign-up")} /> : null}
      {/* Come from the shop, before signing in: back to it. */}
      {way !== "verify" && router.canGoBack() ? <QuietAction label="Keep browsing" disabled={busy} onPress={() => { takeComeBack(); router.back(); }} /> : null}
    </Screen>
  );
}
