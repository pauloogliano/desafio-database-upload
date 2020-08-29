import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const transactionDel = await transactionRepository.findOne(id);

    if (!transactionDel) {
      throw new AppError('ID not found');
    }

    await transactionRepository.remove(transactionDel);
  }
}

export default DeleteTransactionService;
