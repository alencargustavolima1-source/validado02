"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { CartItem, Product, ShippingOption, CheckoutData } from "@/types"

interface CartContextType {
  items: CartItem[]
  isCartOpen: boolean
  coupon: string | null
  couponDiscount: number
  shipping: ShippingOption | null
  checkoutData: CheckoutData
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  applyCoupon: (code: string) => boolean
  removeCoupon: () => void
  setShipping: (option: ShippingOption) => void
  updateCheckoutData: (data: Partial<CheckoutData>) => void
  subtotal: number
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const initialCheckoutData: CheckoutData = {
  customer: { name: "", cpf: "", email: "", phone: "" },
  address: {
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  },
  shipping: null,
  payment: { method: "pix" },
}

const validCoupons: Record<string, number> = {
  VOLTA10: 10,
  ESCOLA20: 20,
  PRIMEIRACOMPRA: 15,
}

const CART_STORAGE_KEY = "papelaria-cart"

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [coupon, setCoupon] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [shipping, setShippingState] = useState<ShippingOption | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutData>(initialCheckoutData)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) {
        const parsed = JSON.parse(savedCart)
        if (parsed.items && Array.isArray(parsed.items)) {
          setItems(parsed.items)
        }
        if (parsed.coupon) {
          setCoupon(parsed.coupon)
          setCouponDiscount(parsed.couponDiscount || 0)
        }
        if (parsed.shipping) {
          setShippingState(parsed.shipping)
        }
        if (parsed.checkoutData) {
          setCheckoutData(parsed.checkoutData)
        }
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho:", error)
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify({
            items,
            coupon,
            couponDiscount,
            shipping,
            checkoutData,
          }),
        )
      } catch (error) {
        console.error("Erro ao salvar carrinho:", error)
      }
    }
  }, [items, coupon, couponDiscount, shipping, checkoutData, isHydrated])

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }
      return [...prev, { product, quantity }]
    })
    setIsCartOpen(true)
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId)
        return
      }
      setItems((prev) => prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item)))
    },
    [removeItem],
  )

  const clearCart = useCallback(() => {
    setItems([])
    setCoupon(null)
    setCouponDiscount(0)
    setShippingState(null)
    setCheckoutData(initialCheckoutData)
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch (error) {
      console.error("Erro ao limpar carrinho:", error)
    }
  }, [])

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), [])

  const applyCoupon = useCallback((code: string): boolean => {
    const upperCode = code.toUpperCase()
    if (validCoupons[upperCode]) {
      setCoupon(upperCode)
      setCouponDiscount(validCoupons[upperCode])
      return true
    }
    return false
  }, [])

  const removeCoupon = useCallback(() => {
    setCoupon(null)
    setCouponDiscount(0)
  }, [])

  const setShipping = useCallback((option: ShippingOption) => {
    setShippingState(option)
    setCheckoutData((prev) => ({ ...prev, shipping: option }))
  }, [])

  const updateCheckoutData = useCallback((data: Partial<CheckoutData>) => {
    setCheckoutData((prev) => ({ ...prev, ...data }))
  }, [])

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  const discountAmount = (subtotal * couponDiscount) / 100
  const total = subtotal - discountAmount + (shipping?.price || 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        isCartOpen,
        coupon,
        couponDiscount,
        shipping,
        checkoutData,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
        applyCoupon,
        removeCoupon,
        setShipping,
        updateCheckoutData,
        subtotal,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
