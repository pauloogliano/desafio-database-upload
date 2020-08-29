import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsService {
  async execute(filePathTransactions: string): Promise<Transaction[]> {
    const readFileTransactions = fs.createReadStream(filePathTransactions);

    const items = csvParse({
      from_line: 2,
    });

    const parseCsv = readFileTransactions.pipe(items);

    const transactions: CSV[] = [];
    const categories: string[] = [];

    parseCsv.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) {
        throw new AppError('Error csv file.');
      }

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCsv.on('end', resolve));

    const categoriesRepository = getRepository(Category);

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoryTitle = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitle = categories
      .filter(category => !existentCategoryTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const addNewCategories = categoriesRepository.create(
      addCategoryTitle.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(addNewCategories);

    const allCategories = [...addNewCategories, ...existentCategories];

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const createTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createTransactions);

    await fs.promises.unlink(filePathTransactions);

    return createTransactions;
  }
}

export default ImportTransactionsService;
