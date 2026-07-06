import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import * as paymentService from './payment.service';
import type {
  CreatePaymentInput,
  ConfirmPaymentInput,
  ListPaymentsQuery,
  SslcommerzCallbackBody,
} from './payment.validation';

export async function createPaymentHandler(req: Request, res: Response): Promise<void> {
  const { rentalOrderId } = req.body as CreatePaymentInput;
  const result = await paymentService.createPayment(req.user!.id, rentalOrderId);
  sendSuccess(res, 201, 'Payment session created. Redirect the customer to paymentUrl.', result);
}

function renderStatusPage(title: string, message: string, tone: 'success' | 'failure'): string {
  const color = tone === 'success' ? '#16a34a' : '#dc2626';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} - GearUp</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background:#f8fafc; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
  .card { background:#fff; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); padding:40px; max-width:420px; text-align:center; }
  h1 { color:${color}; font-size:22px; margin-bottom:12px; }
  p { color:#475569; font-size:15px; line-height:1.5; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

export async function successCallbackHandler(req: Request, res: Response): Promise<void> {
  const payment = await paymentService.handleGatewaySuccess(req.body as SslcommerzCallbackBody);
  if (payment.status === 'COMPLETED') {
    res
      .status(200)
      .send(
        renderStatusPage(
          'Payment Successful',
          `Your payment for transaction ${payment.transactionId} was confirmed. You may close this window.`,
          'success',
        ),
      );
    return;
  }
  res
    .status(200)
    .send(
      renderStatusPage(
        'Payment Could Not Be Verified',
        'We could not verify this payment with the gateway. Please contact support if you were charged.',
        'failure',
      ),
    );
}

export async function failCallbackHandler(req: Request, res: Response): Promise<void> {
  await paymentService.handleGatewayFail(req.body as SslcommerzCallbackBody);
  res
    .status(200)
    .send(
      renderStatusPage('Payment Failed', 'Your payment could not be processed. Please try again.', 'failure'),
    );
}

export async function cancelCallbackHandler(req: Request, res: Response): Promise<void> {
  await paymentService.handleGatewayCancel(req.body as SslcommerzCallbackBody);
  res
    .status(200)
    .send(renderStatusPage('Payment Cancelled', 'You cancelled the payment. No charge was made.', 'failure'));
}

/** SSLCommerz's server-to-server IPN - respond with plain JSON, no HTML needed. */
export async function ipnHandler(req: Request, res: Response): Promise<void> {
  const payment = await paymentService.handleGatewaySuccess(req.body as SslcommerzCallbackBody);
  sendSuccess(res, 200, 'IPN processed.', { status: payment.status });
}

export async function confirmPaymentHandler(req: Request, res: Response): Promise<void> {
  const { transactionId } = req.body as ConfirmPaymentInput;
  const payment = await paymentService.confirmPayment(transactionId, req.user!);
  sendSuccess(res, 200, `Payment status: ${payment.status}.`, payment);
}

export async function listMyPaymentsHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as ListPaymentsQuery;
  const { items, meta } = await paymentService.listMyPayments(req.user!.id, query);
  sendSuccess(res, 200, 'Payments fetched successfully.', items, meta);
}

export async function getPaymentHandler(req: Request, res: Response): Promise<void> {
  const payment = await paymentService.getPaymentById(req.params.id as string, req.user!);
  sendSuccess(res, 200, 'Payment fetched successfully.', payment);
}
