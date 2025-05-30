import { defineStore } from 'pinia';

export const useModalStore = defineStore('modal', {
  state: () => ({
    showForgotPassword: false,
    showResetPassword: false,
  }),
  actions: {
    openForgotPassword() {
      this.showForgotPassword = true;
    },
    closeForgotPassword() {
      this.showForgotPassword = false;
    },
    openResetPassword() {
      this.showResetPassword = true;
    },
    closeResetPassword() {
      this.showResetPassword = false;
    },
  },
});
