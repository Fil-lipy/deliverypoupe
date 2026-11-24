import { prisma } from '@/lib/prisma';

export async function recalculateCart(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: true },
  });
  if (!cart) return;

  const subtotal = cart.items.reduce((sum: number, i: any) => sum + Number(i.subtotal), 0);

  let discount = 0;
  if (cart.couponCode && cart.couponType && cart.couponValue) {
    const couponValue = Number(cart.couponValue);
    if (cart.couponType === 'percentual') {
      discount = subtotal * (couponValue / 100);
      // Apply max discount cap if set
      if (cart.couponMaxDiscount) {
        discount = Math.min(discount, Number(cart.couponMaxDiscount));
      }
    } else if (cart.couponType === 'valor') {
      discount = couponValue;
    }
    // type 'frete' is handled below
    discount = Math.min(discount, subtotal);
  }

  // O frete só é somado à cesta quando o admin habilita explicitamente essa opção.
  // Por padrão está desabilitado: o valor do frete é informado pelo atendente no WhatsApp.
  let deliveryFeeEnabled = false;
  try {
    const feeSetting = await prisma.setting.findUnique({ where: { key: 'delivery_fee_enabled' } });
    deliveryFeeEnabled = (feeSetting?.value ?? 'false') === 'true';
  } catch {
    deliveryFeeEnabled = false;
  }

  let deliveryFee = 0;
  if (deliveryFeeEnabled && cart.deliveryMode === 'DELIVERY' && cart.neighborhoodFee) {
    const fee = Number(cart.neighborhoodFee);
    const freeFrom = cart.neighborhoodFree ? Number(cart.neighborhoodFree) : null;
    if (freeFrom && subtotal >= freeFrom) {
      deliveryFee = 0;
    } else {
      deliveryFee = fee;
    }
  }

  // If coupon type is 'frete', zero out delivery fee
  if (cart.couponType === 'frete' && cart.deliveryMode === 'DELIVERY') {
    deliveryFee = 0;
  }

  const total = Math.max(0, subtotal - discount + deliveryFee);

  await prisma.cart.update({
    where: { id: cartId },
    data: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      deliveryFee: parseFloat(deliveryFee.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    },
  });
}
