import { BadRequestException, ConflictException } from '@nestjs/common';

type StateTransition = {
  from: string;
  to: string;
  allowedRoles: string[];
};

const VALID_TRANSITIONS: StateTransition[] = [
  { from: 'PENDING', to: 'PAID', allowedRoles: ['ADMIN', 'CASHIER'] },
  { from: 'PAID', to: 'SHIPPED', allowedRoles: ['ADMIN'] },
  { from: 'SHIPPED', to: 'COMPLETED', allowedRoles: ['ADMIN'] },
  { from: 'PENDING', to: 'CANCELLED', allowedRoles: ['ADMIN'] },
  { from: 'PAID', to: 'CANCELLED', allowedRoles: ['ADMIN'] },
];

export class OrderStateMachine {
  static canTransition(
    from: string,
    to: string,
    userRole: string,
  ): boolean {
    const transition = VALID_TRANSITIONS.find(
      (t) => t.from === from && t.to === to,
    );
    if (!transition) return false;
    return transition.allowedRoles.includes(userRole);
  }

  static validateTransition(
    from: string,
    to: string,
    userRole: string,
  ): void {
    if (!this.canTransition(from, to, userRole)) {
      throw new ConflictException(
        `Cannot transition from ${from} to ${to} with role ${userRole}`,
      );
    }
  }

  static getAvailableTransitions(
    status: string,
    userRole: string,
  ): string[] {
    return VALID_TRANSITIONS
      .filter((t) => t.from === status && t.allowedRoles.includes(userRole))
      .map((t) => t.to);
  }
}
