import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountSheet({ isOpen, onClose }: AccountSheetProps) {
  const { user, logout } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    onClose();
    await logout();
    window.location.href = getLoginUrl();
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-lg z-50 max-h-[80vh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-border rounded-full" />
            </div>

            {/* Content */}
            <div className="px-6 pb-8">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-foreground">Account</h2>
                {user?.name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.name}
                  </p>
                )}
              </div>

              {/* Account Info */}
              <div className="space-y-4 mb-8">
                {user?.email && (
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm text-foreground font-medium">{user.email}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border my-6" />

              {/* Danger Zone */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Danger Zone
                </p>
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-full py-3 px-4 text-center text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors text-sm font-medium"
                >
                  Sign out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Sign out?</AlertDialogTitle>
          <AlertDialogDescription>
            You'll need to log in again to access your account.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sign out
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
