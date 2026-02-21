import React, { createContext, useContext, useReducer, type ReactNode } from "react";

// ============================================
// BLDG.chat Global State
// React Context + useReducer
// No Redux, no Zustand.
// ============================================

export interface Order {
  id: string;
  service: "laundry" | "dry-cleaning" | "grooming";
  status: "scheduled" | "collected" | "pending-intake" | "charged" | "delivered";
  orderNumber: string;
  pickupWindow: string;
  pickupLocation: string;
  deliveryWindow?: string;
  total?: string;
  finalTotal?: string;
  receipt?: ReceiptItem[];
  collectedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface ReceiptItem {
  label: string;
  amount: string;
  isDiscount?: boolean;
}

export interface UserPreferences {
  waterTemp: string;
  softener: boolean;
  detergent: string;
}

export interface AppState {
  user: {
    name: string;
    unit: string;
    building: string;
    paymentLast4: string;
    paymentBrand: string;
  };
  preferences: UserPreferences;
  orders: Order[];
  notifications: { id: string; message: string; read: boolean; timestamp: string }[];
  buildingUpdates: { id: string; title: string; body: string; type: string; timestamp: string }[];
}

type Action =
  | { type: "ADD_ORDER"; payload: Order }
  | { type: "UPDATE_ORDER"; payload: { id: string; updates: Partial<Order> } }
  | { type: "SET_PREFERENCES"; payload: UserPreferences }
  | { type: "MARK_NOTIFICATION_READ"; payload: string }
  | { type: "ADD_NOTIFICATION"; payload: AppState["notifications"][0] };

const initialState: AppState = {
  user: {
    name: "Alex Rivera",
    unit: "42B",
    building: "Opus Los Angeles",
    paymentLast4: "4242",
    paymentBrand: "Visa",
  },
  preferences: {
    waterTemp: "Cold",
    softener: false,
    detergent: "Hypoallergenic",
  },
  orders: [
    {
      id: "1",
      service: "laundry",
      status: "delivered",
      orderNumber: "LB-0046",
      pickupWindow: "Jan 28, 6–8pm",
      pickupLocation: "Front Desk",
      deliveryWindow: "Jan 29, 6–8pm",
      total: "$21.00",
      finalTotal: "$21.00",
      receipt: [
        { label: "8.5 lbs × $2.50/lb", amount: "$21.25" },
        { label: "Hypoallergenic detergent", amount: "$5.00" },
        { label: "20% first-order discount", amount: "-$5.25", isDiscount: true },
      ],
      collectedAt: "Jan 28, 6:42pm",
      deliveredAt: "Jan 29, 6:15pm",
      createdAt: "2025-01-28T18:00:00Z",
    },
    {
      id: "2",
      service: "laundry",
      status: "collected",
      orderNumber: "LB-0047",
      pickupWindow: "Today, 6–8pm",
      pickupLocation: "Front Desk",
      deliveryWindow: "Tomorrow, 6–8pm",
      total: "Total after intake",
      createdAt: "2025-02-07T18:00:00Z",
      collectedAt: "Today, 6:42pm",
    },
  ],
  notifications: [
    {
      id: "1",
      message: "Your laundry has been collected. We'll finalize your total after intake.",
      read: false,
      timestamp: "2h ago",
    },
  ],
  buildingUpdates: [
    {
      id: "1",
      title: "Pool Maintenance",
      body: "Pool deck closed Feb 10, 8am–12pm for scheduled cleaning.",
      type: "maintenance",
      timestamp: "3h ago",
    },
    {
      id: "2",
      title: "Package Delivery",
      body: "You have 2 packages at the front desk.",
      type: "package",
      timestamp: "5h ago",
    },
    {
      id: "3",
      title: "Resident Social",
      body: "Wine & cheese mixer this Friday, 7pm in the Lounge.",
      type: "event",
      timestamp: "1d ago",
    },
  ],
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_ORDER":
      return { ...state, orders: [action.payload, ...state.orders] };
    case "UPDATE_ORDER":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.id ? { ...o, ...action.payload.updates } : o
        ),
      };
    case "SET_PREFERENCES":
      return { ...state, preferences: action.payload };
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case "ADD_NOTIFICATION":
      return { ...state, notifications: [action.payload, ...state.notifications] };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
