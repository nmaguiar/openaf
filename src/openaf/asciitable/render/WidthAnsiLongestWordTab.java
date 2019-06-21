/**
 * Custom asciitable render 
 * 
 * @author Nuno Aguiar
 * based on de.vandermeer.asciitable.v2.render.WidthLongestWordMaxCol
 *
 */
package openaf.asciitable.render;

import de.vandermeer.asciitable.v2.V2_AsciiTable;
import de.vandermeer.asciitable.v2.render.V2_Width;
import de.vandermeer.asciitable.v2.row.V2_Row;
import de.vandermeer.asciitable.v2.row.ContentRow;
import org.apache.commons.lang3.StringUtils;

public class WidthAnsiLongestWordTab implements V2_Width {

    protected int max;
    protected int[] maxAr;

    public WidthAnsiLongestWordTab(int maxSize) {
		if (maxSize < 3) {
			throw new IllegalArgumentException("Sizeimum column width cannot be smaller than 3");
		}
		this.max = maxSize;
    }

    public WidthAnsiLongestWordTab(int[] maxAr){
		if(maxAr==null){
			throw new IllegalArgumentException("maximum array cannot be null");
		}
		for(int m : maxAr){
			if(m!=-1 && m<3){
				throw new IllegalArgumentException("array contains maximum column width smaller than 3");
			}
		}
		this.maxAr = maxAr;
	}

	public static int[] longestWord(V2_AsciiTable table) {
		if (table == null) {
			return null;
		}

		if (table.getTable().size() == 0) {
			return new int[0];
		}

		int[] ret = new int[table.getColumnCount()];

		for (V2_Row row : table.getTable()) {
			if (row instanceof ContentRow){
				ContentRow crow = (ContentRow) row;
				for (int i = 0; i < crow.getColumns().length; i++) {
					if (crow.getColumns()[i] != null) {
                        String car = crow.getColumns()[i].toString().replaceAll("\\033\\[[0-9;]*m", "");
						String[] ar = StringUtils.split(car);
						for (int k = 0; k < ar.length; k++) {
							int count = ar[k].length() + crow.getPadding()[i] + crow.getPadding()[i];
							if (count > ret[i]) {
								ret[i] = count;
							}
						}
					}
				}
			}
		}

		return ret;
	}

    @Override
    public int[] getColumnWidths(V2_AsciiTable table) {
        if (table == null) {
            return null;
        }

        if (this.maxAr != null && this.maxAr.length != table.getColumnCount()) {
            throw new IllegalArgumentException("maxAr length is not the same as rows in the table");
        }

        int[] ret = WidthAnsiLongestWordTab.longestWord(table);

        for (int i = 0; i < ret.length; i++){
			if (this.max != 0) {
				if (ret[i] > this.max) {
					ret[i] = this.max;
				}
			} else if (this.maxAr != null) {
				if (this.maxAr[i] != -1) {
					if (ret[i] > this.maxAr[i]) {
						ret[i] = this.maxAr[i];
					}
				}
			}
		}

		return ret;
    }

 }