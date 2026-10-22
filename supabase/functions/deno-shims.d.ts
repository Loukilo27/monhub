// Déclarations minimales pour vérifier les Edge Functions (Deno) avec le TypeScript du projet :
// npm run typecheck. Elles ne sont pas déployées.
declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Response | Promise<Response>): void }
declare module 'npm:web-push@3.6.7' {
  const webpush: {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void
    sendNotification(subscription: unknown, payload: string, options?: unknown): Promise<unknown>
  }
  export default webpush
}
