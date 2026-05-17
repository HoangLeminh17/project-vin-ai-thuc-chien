import type { NextRequest, NextResponse } from 'next/server'

export type ApiRouteResponse = Response | NextResponse

export type ApiRouteHandler<
  TArgs extends unknown[] = [],
  TReq extends Request = NextRequest,
> = (req: TReq, ...args: TArgs) => Promise<ApiRouteResponse>
