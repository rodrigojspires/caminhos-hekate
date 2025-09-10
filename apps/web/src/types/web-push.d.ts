declare module 'web-push' {
  interface WebPushAPI {
    setVapidDetails(mailto: string, publicKey: string, privateKey: string): void;
    sendNotification(subscription: any, payload?: string, options?: any): Promise<any>;
  }
  const webpush: WebPushAPI;
  export default webpush;
}